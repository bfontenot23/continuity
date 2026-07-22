/** Schema migrations applied at every project persistence boundary. */
import { Project } from './types';

export function migrateProject(project: Project): void {
  for (const continuity of project.continuities ?? []) {
    continuity.branches ??= [];
    for (const branch of continuity.branches) {
      branch.lineStyle ??= 'solid';
      branch.startEndpointStyle ??= 'dot';
      branch.endEndpointStyle ??= 'dot';
    }
  }

  for (const line of project.lines ?? []) {
    line.lineStyle ??= 'solid';
    line.startEndpointStyle ??= 'dot';
    line.endEndpointStyle ??= 'dot';
  }
}
