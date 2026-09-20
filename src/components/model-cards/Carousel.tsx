import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CatalogueMetadata, CatalogueModel, VerificationBackend } from '../../data/types/catalogue';
import type { ReferenceRuntimeContext } from '../../data/derive/referenceContext';
import { ModelCard } from './ModelCard';

interface CarouselProps {
  models: CatalogueModel[];
  metadata: CatalogueMetadata;
  references: Record<string, ReferenceRuntimeContext | null>;
  verificationBackends: Record<string, VerificationBackend[]>;
}

/** Signed offset of index `i` from `selected`, wrapped to the shortest direction around the circle. */
function relativeOffset(i: number, selected: number, total: number): number {
  let delta = i - selected;
  const half = total / 2;
  while (delta > half) delta -= total;
  while (delta <= -half) delta += total;
  return delta;
}

const DRAG_NAVIGATE_THRESHOLD_PX = 60;
/** Smaller than DRAG_NAVIGATE_THRESHOLD_PX: any movement past this suppresses the trailing click. */
const DRAG_SUPPRESS_CLICK_THRESHOLD_PX = 10;
/** Safety-net window to clear a stuck suppression flag if no click ever follows (e.g. some touch paths). */
const CLICK_SUPPRESSION_RESET_MS = 400;
const WHEEL_THRESHOLD_PX = 40;
const WHEEL_COOLDOWN_MS = 350;

export function Carousel({ models, metadata, references, verificationBackends }: CarouselProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const total = models.length;
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{ pointerId: number; startX: number; moved: boolean } | null>(null);
  const suppressNextClickRef = useRef(false);
  const lastWheelAt = useRef(0);

  const goTo = useCallback(
    (index: number) => {
      setSelectedIndex(((index % total) + total) % total);
    },
    [total],
  );

  const goNext = useCallback(() => goTo(selectedIndex + 1), [goTo, selectedIndex]);
  const goPrev = useCallback(() => goTo(selectedIndex - 1), [goTo, selectedIndex]);

  const selectById = useCallback(
    (modelId: string) => {
      const index = models.findIndex((model) => model.id === modelId);
      if (index >= 0) goTo(index);
    },
    [models, goTo],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // The track's own listener would otherwise also receive ArrowLeft/ArrowRight bubbled up from
      // any focused descendant (a provenance link, the reference-context <summary>, a card's own
      // select button, ...). Only navigate when the track itself is the actual keyboard focus.
      if (event.target !== trackRef.current) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      }
    }
    const node = trackRef.current;
    node?.addEventListener('keydown', onKeyDown);
    return () => node?.removeEventListener('keydown', onKeyDown);
  }, [goNext, goPrev]);

  function onWheel(event: React.WheelEvent) {
    const magnitude = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : 0;
    if (Math.abs(magnitude) < WHEEL_THRESHOLD_PX) return;
    const now = performance.now();
    if (now - lastWheelAt.current < WHEEL_COOLDOWN_MS) return;
    lastWheelAt.current = now;
    if (magnitude > 0) goNext();
    else goPrev();
  }

  function onPointerDown(event: React.PointerEvent) {
    dragState.current = { pointerId: event.pointerId, startX: event.clientX, moved: false };
  }

  function onPointerMove(event: React.PointerEvent) {
    const drag = dragState.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.moved && Math.abs(event.clientX - drag.startX) > DRAG_SUPPRESS_CLICK_THRESHOLD_PX) {
      drag.moved = true;
    }
  }

  function endDrag(event: React.PointerEvent) {
    const drag = dragState.current;
    dragState.current = null;
    if (!drag || event.pointerId !== drag.pointerId) return;

    const delta = event.clientX - drag.startX;
    if (drag.moved) {
      // A completed drag must not also let the browser's trailing click event fall through to a
      // side card's selection button underneath the pointer and override the drag's own outcome.
      suppressNextClickRef.current = true;
      setTimeout(() => {
        suppressNextClickRef.current = false;
      }, CLICK_SUPPRESSION_RESET_MS);
    }
    if (Math.abs(delta) >= DRAG_NAVIGATE_THRESHOLD_PX) {
      if (delta < 0) goNext();
      else goPrev();
    }
  }

  function onPointerCancel() {
    dragState.current = null;
  }

  function onClickCapture(event: React.MouseEvent) {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
    }
  }

  const offsets = useMemo(
    () => models.map((_, index) => relativeOffset(index, selectedIndex, total)),
    [models, selectedIndex, total],
  );

  return (
    <div className="carousel-wrapper">
      <div className="carousel" aria-roledescription="carousel" aria-label="Model Cards">
        <button type="button" className="carousel-nav carousel-nav-prev" onClick={goPrev} aria-label="Previous model">
          <span aria-hidden="true">‹</span>
        </button>

        <div
          ref={trackRef}
          className="carousel-track"
          tabIndex={0}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={onPointerCancel}
          onClickCapture={onClickCapture}
        >
          {models.map((model, index) => (
            <ModelCard
              key={model.id}
              model={model}
              metadata={metadata}
              reference={references[model.id] ?? null}
              verificationBackends={verificationBackends[model.id] ?? model.verificationBackends}
              cardNumber={index + 1}
              selected={index === selectedIndex}
              offset={offsets[index]!}
              onSelect={selectById}
            />
          ))}
        </div>

        <button type="button" className="carousel-nav carousel-nav-next" onClick={goNext} aria-label="Next model">
          <span aria-hidden="true">›</span>
        </button>
      </div>

      <div className="carousel-dots" role="group" aria-label="Choose a model">
        {models.map((model, index) => (
          <button
            key={model.id}
            type="button"
            className="carousel-dot"
            aria-current={index === selectedIndex ? 'true' : undefined}
            aria-label={`Show ${model.displayName}`}
            data-active={index === selectedIndex}
            onClick={() => goTo(index)}
          />
        ))}
      </div>
    </div>
  );
}
