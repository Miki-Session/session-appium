import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import {
  allureCurrentReportDir,
  allureReportsDir,
  allureResultsDir,
  backupHistoryDir,
} from '../../../../constants/allure';
import { SupportedPlatformsType } from '../open_app';

// Create environment.properties file with platform and build info
async function createEnvProperties(platform: SupportedPlatformsType, build: string) {
  const envPropertiesFile = path.join(allureResultsDir, 'environment.properties');
  const content = `platform=${platform}\nbuild=${build}`;

  await fs.writeFile(envPropertiesFile, content);
  console.log(`Created environment.properties:\n${content}`);
}

// Generate Allure report from the results directory
async function generateAllureReport() {
  return new Promise<void>((resolve, reject) => {
    exec(`allure generate ${allureResultsDir} -o ${allureCurrentReportDir} --clean`, error => {
      if (error) {
        return reject(new Error(`Allure report generation failed: ${error.message}`));
      }
      console.log('Allure report generated successfully.');
      resolve();
    });
  });
}

// Close test run: handle histories, generate report, and clean up
async function closeRun(platform: SupportedPlatformsType, build: string) {
  const resultsHistoryDir = path.join(allureResultsDir, 'history');
  const reportHistoryDir = path.join(allureReportsDir, 'history');

  await createEnvProperties(platform, build);

  // Merge archived history if exists
  if (await fs.pathExists(backupHistoryDir)) {
    await fs.ensureDir(resultsHistoryDir);
    await fs.copy(backupHistoryDir, resultsHistoryDir, { overwrite: true });
    console.log('Archived history merged successfully.');
  } else {
    console.log('No archived history found.');
  }

  await generateAllureReport();

  // Archive the current run's history
  if (await fs.pathExists(reportHistoryDir)) {
    await fs.copy(reportHistoryDir, backupHistoryDir, { overwrite: true });
    console.log('Current history archived successfully.');
  } else {
    console.log('No report history to archive.');
  }

  // Clear allure-results directory for next run
  await fs.emptyDir(allureResultsDir);
  console.log('Allure results cleared.');
}

// Parse CLI arguments and start the closing process
async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option('platform', {
      alias: 'p',
      choices: ['android', 'ios'] as SupportedPlatformsType[],
      description: 'The platform (android or ios)',
      demandOption: true,
    })
    .option('build', {
      alias: 'b',
      type: 'string',
      description: 'The build number (e.g., 2.8.7)',
      demandOption: true,
    })
    .parseAsync();

  await closeRun(argv.platform, argv.build);
}

main().catch(err => {
  console.error('Error during execution:', err);
});
