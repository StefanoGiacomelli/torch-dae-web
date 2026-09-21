import type { SourceOptions } from './source';

export function parseSourceOptions(args: string[]): SourceOptions {
  const options: SourceOptions = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]!;
    const value = args[index + 1];
    if (argument === '--ref' && value) {
      options.requestedRef = value;
      index += 1;
    } else if (argument === '--source' && (value === 'local' || value === 'github')) {
      options.mode = value;
      index += 1;
    } else if (argument === '--repo-path' && value) {
      options.repositoryPath = value;
      index += 1;
    } else {
      throw new Error(`Unknown or incomplete source option: ${argument}`);
    }
  }
  return options;
}
