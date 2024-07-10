import { androidIt, iosIt } from "../../types/sessionIt";
import { newUser } from "./utils/create_account";
import { newContact } from "./utils/create_contact";
import { SupportedPlatformsType, openAppTwoDevices } from "./utils/open_app";

iosIt("Check performance", checkPerformance);
androidIt("Check performance", checkPerformance);

// bothPlatformsIt("Check performance", checkPerformance);

async function checkPerformance(platform: SupportedPlatformsType) {
  const { device1, device2 } = await openAppTwoDevices(platform);
  // Create two users
  const [userA, userB] = await Promise.all([
    newUser(device1, "Alice", platform),
    newUser(device2, "Bob", platform),
  ]);
  // Create contact
  await newContact(platform, device1, userA, device2, userB);
  const timesArray: Array<number> = [];

  let i;
  for (i = 1; i <= 10; i++) {
    const timeMs = await device1.measureSendingTime(i);
    timesArray.push(timeMs);
  }
  console.log(timesArray);
}

// Media saved notification
// Send all message types in communities

// yarn test-describe --grep "Message checks ios"
