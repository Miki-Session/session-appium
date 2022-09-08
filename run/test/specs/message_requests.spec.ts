import { iosIt, androidIt } from "../../types/sessionIt";
import { newUser } from "./utils/create_account";
import {
  SupportedPlatformsType,
  openAppTwoDevices,
  closeApp,
} from "./utils/open_app";
import { sendNewMessage } from "./utils/send_new_message";
import { clickOnElement, hasElementBeenDeleted } from "./utils/utilities";

async function acceptRequest(platform: SupportedPlatformsType) {
  // Check 'accept' button
  // Open app
  const { server, device1, device2 } = await openAppTwoDevices(platform);
  // Create two users
  const [userA, userB] = await Promise.all([
    newUser(device1, "User A"),
    newUser(device2, "User B"),
  ]);
  // Send message from User A to User B
  await sendNewMessage(device1, userB);
  // Wait for banner to appear
  await device2.setImplicitWaitTimeout(5000);
  // User B clicks on message request banner
  await clickOnElement(device2, "Message requests banner");
  // User B clicks on request conversation item
  await clickOnElement(device2, "Message request");
  // User B clicks accept button
  await clickOnElement(device2, "Accept message request");
  // Verify config message for User A 'Your message request has been accepted'
  await findElement(device1, "Message request has been accepted");
  // Close app
  await closeApp(server, device1, device2);

  // Check accept request by sending text message
  // Open app
  // Create two users
  // Send message from User A to User B
  // User B clicks on message request banner
  // User B clicks on request conversation item
  // Send message from User B to User A
  // Check for config message for User A 'Your message request has been accepted'
  // Close app
}

async function declineRequest(platform: SupportedPlatformsType) {
  // Check 'decline' button
  const { server, device1, device2 } = await openAppTwoDevices(platform);
  // Create two users
  const [userA, userB] = await Promise.all([
    newUser(device1, "User A"),
    newUser(device2, "User B"),
  ]);
  // Send message from User A to User B
  await sendNewMessage(device1, userB);
  // Wait for banner to appear
  await device2.setImplicitWaitTimeout(5000);
  // User B clicks on message request banner
  await clickOnElement(device2, "Message requests banner");
  // User B clicks on request conversation item
  await clickOnElement(device2, "Message request");
  // Click on decline button
  await clickOnElement(device2, "Decline message request");
  // Look for message request list item
  await hasElementBeenDeleted(device2, "Message request");
  // Close app
  await closeApp(server, device1, device2);
}

describe("Message", () => {
  iosIt("Message requests decline", acceptRequest);
  androidIt("Message requests decline", acceptRequest);

  iosIt("Message requests decline", declineRequest);
  androidIt("Message requests decline", declineRequest);
});
function findElement(device1: wd.PromiseWebdriver, arg1: string) {
  throw new Error("Function not implemented.");
}
