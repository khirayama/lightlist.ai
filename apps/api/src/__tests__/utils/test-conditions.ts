import { execSync } from 'child_process';

// Docker availability check
export function isDockerAvailable(): boolean {
  try {
    execSync('docker --version', { stdio: 'pipe' });
    execSync('docker ps', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

// Skip test if Docker is not available
export function skipIfNoDocker(testName: string) {
  if (!isDockerAvailable()) {
    console.warn(`Skipping test "${testName}" - Docker not available`);
    return true;
  }
  return false;
}

// Conditional test runner
export const conditionalTest = {
  docker: (name: string, fn: () => void | Promise<void>) => {
    if (isDockerAvailable()) {
      return test(name, fn);
    } else {
      return test.skip(name, fn);
    }
  },
  
  dockerDescribe: (name: string, fn: () => void) => {
    if (isDockerAvailable()) {
      return describe(name, fn);
    } else {
      return describe.skip(name, fn);
    }
  }
};