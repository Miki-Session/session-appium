import { androidIt, iosIt } from "../../types/sessionIt";
import { TickButton } from "./locators";
import { sleepFor } from "./utils";
import { newUser } from "./utils/create_account";
import { newContact } from "./utils/create_contact";
import {
  SupportedPlatformsType,
  openAppTwoDevices,
  closeApp,
} from "./utils/open_app";

iosIt("Set nickname", setNicknameIos);
androidIt("Set nickname", setNicknameAndroid);

async function setNicknameIos(platform: SupportedPlatformsType) {
  const { device1, device2 } = await openAppTwoDevices(platform);
  const nickName = "New nickname";
  const [userA, userB] = await Promise.all([
    newUser(device1, "Alice", platform),
    newUser(device2, "Bob", platform),
  ]);
  await newContact(platform, device1, userA, device2, userB);
  // Click on settings/more info
  await device1.clickOnByAccessibilityID("More options");
  // Click on username to set nickname
  await device1.clickOnByAccessibilityID("Username");
  await sleepFor(500);
  await device1.clickOnByAccessibilityID("Username");
  await device1.deleteText("Username");
  // Type in nickname
  await device1.inputText("accessibility id", "Username", nickName);
  // Click apply/done
  await device1.clickOnByAccessibilityID("Done");
  // Check it's changed in heading also
  await device1.navigateBack(platform);
  const newNickname = await device1.grabTextFromAccessibilityId(
    "Conversation header name"
  );
  await device1.findMatchingTextAndAccessibilityId(
    "Conversation header name",
    newNickname
  );
  // Check in conversation list also
  await device1.navigateBack(platform);
  // Save text of conversation list item?
  await sleepFor(1000);
  await device1.findMatchingTextAndAccessibilityId(
    "Conversation list item",
    nickName
  );
  // Set nickname back to original username
  await device1.selectByText("Conversation list item", nickName);
  // Click on settings/more info
  await device1.clickOnByAccessibilityID("More options");
  // Click on edit
  await device1.clickOnByAccessibilityID("Username");
  // Empty username input
  await device1.deleteText("Username");
  await device1.inputText("accessibility id", "Username", " ");
  await await device1.clickOnByAccessibilityID("Done");
  // Check in conversation header
  await device1.navigateBack(platform);
  // await sleepFor(500);
  const revertedNickname = await device1.grabTextFromAccessibilityId(
    "Conversation header name"
  );
  console.warn(`revertedNickname:` + revertedNickname);
  if (revertedNickname !== userB.userName) {
    throw new Error(`revertedNickname doesn't match username`);
  }
  await device1.navigateBack(platform);
  // Check in conversation list aswell
  await device1.findMatchingTextAndAccessibilityId(
    "Conversation list item",
    userB.userName
  );
  // Close app
  await closeApp(device1, device2);
}

async function setNicknameAndroid(platform: SupportedPlatformsType) {
  const { device1, device2 } = await openAppTwoDevices(platform);
  const [userA, userB] = await Promise.all([
    newUser(device1, "Alice", platform),
    newUser(device2, "Bob", platform),
  ]);
  const nickName = "New nickname";
  await newContact(platform, device1, userA, device2, userB);
  // Go back to conversation list
  await device1.navigateBack(platform);
  // Select conversation in list with Bob
  await device1.longPressConversation(userB.userName);
  // Select 'Details' option
  await device1.clickOnByAccessibilityID("Details");
  // Select username to edit
  await device1.clickOnByAccessibilityID("Edit user nickname");
  // Type in nickname
  await device1.inputText("accessibility id", "Username", nickName);
  // Click on tick button
  await device1.clickOnByAccessibilityID("Apply");
  // CLick out of pop up
  await device1.clickOnByAccessibilityID("Message user");
  // Check name at top of conversation is nickname
  const headerElement = await device1.waitForTextElementToBePresent({
    strategy: "accessibility id",
    selector: "Conversation header name",
  });
  await device1.getTextFromElement(headerElement);
  // Send a message so nickname is updated in conversation list
  await device1.sendMessage("Howdy");
  // Navigate out of conversation
  await device1.navigateBack(platform);
  // Change nickname back to original username
  // Long press on contact conversation
  await device1.longPressConversation(nickName);
  // Select details
  await device1.clickOnByAccessibilityID("Details");
  // Click on username to edit
  await device1.clickOnByAccessibilityID("Edit user nickname");
  // Click apply without entering new nickname
  await device1.clickOnElementAll(new TickButton(device1));
  // Click out of pop up
  await device1.back();
  // Enter conversation to verify change
  await device1.selectByText("Conversation list item", nickName);
  const changedElement = await device1.waitForTextElementToBePresent({
    strategy: "accessibility id",
    selector: "Conversation header name",
  });
  const headerUsername = await device1.getTextFromElement(changedElement);
  if (headerUsername === nickName) {
    console.log("Nickname has been changed in header correctly");
  }
  // Send message to change in conversation list
  await device1.sendMessage("Howdy");
  // Navigate back to list
  await device1.navigateBack(platform);
  // Verify name change in list
  // Save text of conversation list item?
  await device1.selectByText("Conversation list item", nickName);
  const changedListName = await device1.waitForTextElementToBePresent({
    strategy: "accessibility id",
    selector: "Conversation header name",
    text: nickName,
  });
  const listName = await device1.getTextFromElement(changedListName);
  if (listName === nickName) {
    console.log("Nickname has been changed in list correctly");
  }

  // Close app
  await closeApp(device1, device2);
}
