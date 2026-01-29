import { Project } from './types';

/**
 * File system operations for .cty (continuity) files
 * These are JSON-based custom format files
 */

export class ContinuityFileManager {
  private static appInfo: { version: string; copyright?: string; license?: string; bugReportUrl?: string } | null = null;
  
  /**
   * Load app info from app_info.json
   */
  static async loadAppInfo(): Promise<{ version: string; copyright?: string; license?: string; bugReportUrl?: string }> {
    if (this.appInfo) {
      return this.appInfo;
    }
    
    try {
      const response = await fetch('/assets/app_info.json');
      if (!response.ok) {
        throw new Error('Failed to load app_info.json');
      }
      this.appInfo = await response.json();
      return this.appInfo;
    } catch (error) {
      console.error('Error loading app info:', error);
      // Return a default version if app_info.json is not available
      return { version: '26.1.2' };
    }
  }

  /**
   * Compare two version strings (e.g., "26.1.2")
   * Returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2
   */
  static compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(p => parseInt(p, 10));
    const parts2 = v2.split('.').map(p => parseInt(p, 10));
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }
    
    return 0;
  }

  /**
   * Export a project to a .cty file
   */
  static async exportProject(project: Project, filename?: string): Promise<void> {
    const appInfo = await this.loadAppInfo();
    
    // Add current app version to project
    const projectToExport = {
      ...project,
      appVersion: appInfo.version
    };
    
    const ctyFilename = filename || `${projectToExport.title.replace(/\s+/g, '-')}.cty`;
    const json = JSON.stringify(projectToExport, null, 2);
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
   * Returns the project and a version check result
   */
  static async importProject(file: File): Promise<{ project: Project; versionWarning?: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = event.target?.result as string;
          const project = JSON.parse(json) as Project;
          
          // Validate basic structure
          if (!project.id || !project.title || !Array.isArray(project.continuities)) {
            throw new Error('Invalid .cty file format');
          }
          
          // Check version and generate warning if needed
          const appInfo = await this.loadAppInfo();
          const fileVersion = project.appVersion || '26.1.1'; // Treat unmarked files as v26.1.1
          const currentVersion = appInfo.version;
          
          let versionWarning: string | undefined;
          if (this.compareVersions(fileVersion, currentVersion) < 0) {
            versionWarning = `This project was created with version ${fileVersion} but you are using version ${currentVersion}. Some features may not work correctly. Consider resaving the project to update it.`;
          }
          
          // Migrate old projects to include branches array
          this.migrateProject(project);
          
          resolve({ project, versionWarning });
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
   * Migrate old project formats to current schema
   * Adds missing properties that didn't exist in earlier versions
   */
  static migrateProject(project: Project): void {
    // Ensure all continuities have branches array
    if (project.continuities && Array.isArray(project.continuities)) {
      project.continuities.forEach((continuity: any) => {
        if (!continuity.branches) {
          continuity.branches = [];
        }

        // Backfill branch defaults for older files
        continuity.branches.forEach((branch: any) => {
          if (!branch.lineStyle) branch.lineStyle = 'solid';
          if (!branch.startEndpointStyle) branch.startEndpointStyle = 'dot';
          if (!branch.endEndpointStyle) branch.endEndpointStyle = 'dot';
        });
      });
    }

    // Backfill line defaults for older projects
    if (project.lines && Array.isArray(project.lines)) {
      project.lines.forEach((line: any) => {
        if (!line.lineStyle) line.lineStyle = 'solid';
        if (!line.startEndpointStyle) line.startEndpointStyle = 'dot';
        if (!line.endEndpointStyle) line.endEndpointStyle = 'dot';
      });
    }
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
    if (!json) return null;
    
    const project = JSON.parse(json) as Project;
    
    // Apply migrations to old projects
    ContinuityFileManager.migrateProject(project);
    
    return project;
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
