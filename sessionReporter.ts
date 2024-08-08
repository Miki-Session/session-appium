import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestError,
  TestResult,
} from '@playwright/test/reporter';
import chalk from 'chalk';
import { Dictionary, groupBy, isEmpty, mean, sortBy } from 'lodash';

import dotenv from 'dotenv';
dotenv.config();

type TestAndResult = { test: TestCase; result: TestResult };

function sortByTitle(toSort: Dictionary<Array<TestAndResult>>) {
  return sortBy(Object.values(toSort), a => a[0].test.title);
}

function getChalkColorForStatus(result: Pick<TestResult, 'status'>) {
  return result.status === 'passed'
    ? chalk.green
    : result.status === 'interrupted'
      ? chalk.yellow
      : result.status === 'skipped'
        ? chalk.blue
        : chalk.red;
}

function testResultToDurationStr(tests: Array<Pick<TestAndResult, 'result'>>) {
  const inSeconds = tests.map(m => m.result).map(r => Math.floor(r.duration / 1000));
  return inSeconds.map(m => `${m}s`).join(',');
}

function formatGroupedByResults(testAndResults: Array<TestAndResult>) {
  const allPassed = testAndResults.every(m => m.result.status === 'passed');
  const allFailed = testAndResults.every(m => m.result.status === 'failed');
  const allSkipped = testAndResults.every(m => m.result.status === 'skipped');
  const firstItem = testAndResults[0]; // we know they all have the same state
  const statuses = testAndResults.map(m => `"${m.result.status}"`).join(',');

  const times =
    testAndResults.length === 1
      ? 'once'
      : testAndResults.length === 2
        ? 'twice'
        : `${testAndResults.length} times`;
  console.log(
    `${getChalkColorForStatus(
      allPassed
        ? { status: 'passed' }
        : allFailed
          ? { status: 'failed' }
          : allSkipped
            ? { status: 'skipped' }
            : { status: 'interrupted' }
    )(
      `\t\t\t"${
        firstItem.test.title
      }": run ${times}, statuses:[${statuses}], durations: [${testResultToDurationStr(
        testAndResults
      )}]`
    )}`
  );
}

class SessionReporter implements Reporter {
  private printTestConsole: boolean;
  private startTime: number = 0;
  private allTestsCount: number = 0;
  private allResults: Array<TestAndResult> = [];
  private countWorkers: number = 1;

  constructor() {
    this.printTestConsole = !isEmpty(process.env.PRINT_TEST_LOGS);
  }

  onBegin(config: FullConfig, suite: Suite) {
    this.allTestsCount = suite.allTests().length;
    this.countWorkers = config.workers;

    console.log(
      `\t\tStarting the run with ${this.allTestsCount} tests, with ${this.countWorkers} workers, ${config.projects[0].retries} retries and ${config.projects[0].repeatEach} repeats`
    );
    this.startTime = Date.now();
  }

  onTestBegin(test: TestCase, result: TestResult) {
    console.log(
      chalk.magenta(
        `\tStarting test "${test.title}"  ` + `${result.retry > 0 ? `Retry #${test.retries}` : ''}`
      )
    );
  }

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status !== 'passed') {
      console.log(
        `${getChalkColorForStatus(result)(
          `\t\tFinished test "${test.title}": ${result.status} with stdout/stderr`
        )}`
      );
      console.info(`stdout:`);
      result.stdout.map(t => process.stdout.write(t.toString()));

      console.info('stderr:');
      result.stderr.map(t => process.stderr.write(t.toString()));

      console.info(
        `test failed with "${result.error?.message}" \n\tvalue:${result.error?.value} \n\tsnippet:${result.error?.snippet} \n\tstack:${result.error?.stack}`
      );
    } else {
      console.log(
        `${getChalkColorForStatus(result)(`\t\tFinished test "${test.title}": ${result.status}`)}`
      );
    }
    this.allResults.push({ test, result });

    console.log(chalk.bgWhiteBright.black(`\t\tResults so far:`));
    // we keep track of all the failed/passed states, but only render the passed status here even if it took a few retries

    const { allFailedSoFar, allPassedSoFar, partiallyPassed } = this.groupResultsByTestName();

    sortByTitle(allPassedSoFar).forEach(m => formatGroupedByResults(m));
    sortByTitle(partiallyPassed).forEach(m => formatGroupedByResults(m));
    sortByTitle(allFailedSoFar).forEach(m => formatGroupedByResults(m));

    const notPassedCount =
      this.allTestsCount - this.allResults.filter(m => m.result.status === 'passed').length;
    const estimateLeftMs = notPassedCount * mean(this.allResults.map(m => m.result.duration));
    const estimatedTotalMins = Math.floor(estimateLeftMs / (60 * 1000));
    console.log(
      chalk.bgWhite.black(
        `\t\tRemaining tests: ${notPassedCount}, rougly ${estimatedTotalMins}min total left, so about ${Math.ceil(
          estimatedTotalMins / this.countWorkers
        )}min as we have ${this.countWorkers} worker(s)...`
      )
    );
  }

  private groupResultsByTestName() {
    const groupedByTitle = groupBy(this.allResults, a => a.test.title);
    const allKeysPassedSoFar = Object.keys(groupedByTitle).filter(k => {
      return groupedByTitle[k].every(m => m.result.status === 'passed');
    });

    const keysPartiallyPassedAndFailedSoFar = Object.keys(groupedByTitle).filter(k => {
      return (
        groupedByTitle[k].some(m => m.result.status !== 'passed') &&
        groupedByTitle[k].some(m => m.result.status === 'passed')
      );
    });

    const allKeysFailedSoFar = Object.keys(groupedByTitle).filter(k => {
      return groupedByTitle[k].every(m => m.result.status !== 'passed');
    });

    return {
      allPassedSoFar: groupBy(
        this.allResults.filter(m => allKeysPassedSoFar.includes(m.test.title)),
        m => m.test.title
      ),
      allFailedSoFar: groupBy(
        this.allResults.filter(m => allKeysFailedSoFar.includes(m.test.title)),
        m => m.test.title
      ),
      partiallyPassed: groupBy(
        this.allResults.filter(m => keysPartiallyPassedAndFailedSoFar.includes(m.test.title)),
        m => m.test.title
      ),
    };
  }

  onEnd(result: FullResult) {
    console.log(
      chalk.bgWhiteBright.black(
        `\n\n\n\t\tFinished the run: ${result.status}, count of tests run: ${
          this.allResults.length
        }, took ${Math.floor((Date.now() - this.startTime) / (60 * 1000))} minute(s)`
      )
    );
    const { allFailedSoFar, allPassedSoFar, partiallyPassed } = this.groupResultsByTestName();

    sortByTitle(allPassedSoFar).forEach(m => formatGroupedByResults(m));
    sortByTitle(partiallyPassed).forEach(m => formatGroupedByResults(m));
    sortByTitle(allFailedSoFar).forEach(m => formatGroupedByResults(m));
  }

  onStdOut?(chunk: string | Buffer, test: void | TestCase, _result: void | TestResult) {
    if (this.printTestConsole) {
      process.stdout.write(`"${test ? `${chalk.cyanBright(test.title)}` : ''}": ${chunk}`);
    }
  }

  onStdErr?(chunk: string | Buffer, test: void | TestCase, _result: void | TestResult) {
    if (this.printTestConsole) {
      process.stdout.write(`"${test ? `${chalk.cyanBright(test.title)}` : ''}":err: ${chunk}`);
    }
  }

  onError?(error: TestError) {
    console.info('global error:', error);
  }
}

export default SessionReporter;
