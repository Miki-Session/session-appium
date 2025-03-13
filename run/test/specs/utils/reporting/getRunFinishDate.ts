import fs from 'fs-extra';
import path from 'path';
import { allureCurrentReportDir } from '../../../../constants/allure';

export async function getRunFinishDate(): Promise<string> {
  const summaryPath = path.join(allureCurrentReportDir, 'widgets', 'summary.json');
  const summaryContent = await fs.readFile(summaryPath, 'utf8');
  const summary = JSON.parse(summaryContent);
  const timestamp = Number(summary.time.stop);
  const dateObj = new Date(timestamp);
  if (isNaN(dateObj.getTime())) {
    throw new Error('Failed to convert timestamp to a valid date object.');
  }
  const year = dateObj.getFullYear();
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const day = dateObj.getDate().toString().padStart(2, '0');
  const formattedDate: string = `${year}-${month}-${day}`;
  return formattedDate;
}
