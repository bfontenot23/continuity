import { Project } from './types';

/**
 * File system operations for .cty (continuity) files
 * These are JSON-based custom format files
 */

export class ContinuityFileManager {
  /**
   * Export a project to a .cty file
   */
  static exportProject(project: Project, filename?: string): void {
    const ctyFilename = filename || `${project.title.replace(/\s+/g, '-')}.cty`;
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = ctyFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Import a project from a .cty file
   */
  static async importProject(file: File): Promise<Project> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = event.target?.result as string;
          const project = JSON.parse(json) as Project;
          
          // Validate basic structure
          if (!project.id || !project.title || !Array.isArray(project.continuities)) {
            throw new Error('Invalid .cty file format');
          }
          
          resolve(project);
        } catch (error) {
          reject(new Error(`Failed to parse .cty file: ${error instanceof Error ? error.message : String(error)}`));
        }
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsText(file);
    });
  }

  /**
   * Validate if a file is a valid .cty file
   */
  static isValidCtyFile(filename: string): boolean {
    return filename.endsWith('.cty');
  }

  /**
   * Create a text representation for debugging/display
   */
  static projectToString(project: Project): string {
    return JSON.stringify(project, null, 2);
  }
}

/**
 * Local storage manager for auto-saving work
 */
export class LocalStorageManager {
  private static readonly KEY_PREFIX = 'continuity_';

  static saveProject(project: Project): void {
    const key = `${LocalStorageManager.KEY_PREFIX}${project.id}`;
    localStorage.setItem(key, JSON.stringify(project));
  }

  static loadProject(projectId: string): Project | null {
    const key = `${LocalStorageManager.KEY_PREFIX}${projectId}`;
    const json = localStorage.getItem(key);
    return json ? JSON.parse(json) : null;
  }

  static listProjects(): string[] {
    const projects: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(LocalStorageManager.KEY_PREFIX)) {
        projects.push(key);
      }
    }
    return projects;
  }

  static deleteProject(projectId: string): void {
    const key = `${LocalStorageManager.KEY_PREFIX}${projectId}`;
    localStorage.removeItem(key);
  }
}
