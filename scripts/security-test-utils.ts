export type SecurityCheckResult = {
  name: string;
  ok: boolean;
  detail?: string;
};

export class SecurityCheckRunner {
  private readonly results: SecurityCheckResult[] = [];

  async record(name: string, check: () => void | Promise<void>): Promise<void> {
    try {
      await check();
      this.results.push({ name, ok: true });
    } catch (error) {
      this.results.push({
        name,
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  printAndSetExitCode(): void {
    const failed = this.results.filter((result) => !result.ok);

    for (const result of this.results) {
      const mark = result.ok ? 'PASS' : 'FAIL';
      const detail = result.detail ? ` - ${result.detail}` : '';
      console.log(`${mark} ${result.name}${detail}`);
    }

    if (failed.length > 0) {
      process.exitCode = 1;
    }
  }
}

export const expect = (condition: boolean, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

export const expectThrows = async (
  callback: () => void | Promise<void>,
  expectedMessage: string,
): Promise<void> => {
  try {
    await callback();
  } catch {
    return;
  }

  throw new Error(expectedMessage);
};
