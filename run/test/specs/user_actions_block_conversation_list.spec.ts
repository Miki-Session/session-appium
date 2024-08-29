import { androidIt, iosIt } from '../../types/sessionIt';
import { runOnlyOnAndroid, runOnlyOnIOS, sleepFor } from './utils';
import { newUser } from './utils/create_account';
import { newContact } from './utils/create_contact';
import { SupportedPlatformsType, closeApp, openAppTwoDevices } from './utils/open_app';

androidIt('Block user in conversation list', blockUserInConversationList);

// bothPlatformsIt("Block user in conversation list", blockUserInConversationList);

async function blockUserInConversationList(platform: SupportedPlatformsType) {
  // Open App
  const { device1, device2 } = await openAppTwoDevices(platform);
  // Create Alice
  // Create Bob
  const [userA, userB] = await Promise.all([
    newUser(device1, 'Alice', platform),
    newUser(device2, 'Bob', platform),
  ]);
  // Create contact
  await newContact(platform, device1, userA, device2, userB);
  // Navigate back to conversation list
  await device1.navigateBack(platform);
  // on ios swipe left on conversation
  await device1.longPressConversation(userB.userName);
  await sleepFor(1000);
  await device1.clickOnElementAll({ strategy: 'accessibility id', selector: 'Block' });
  // await device1.clickOnByAccessibilityID('Block');
  await closeApp(device1, device2);
}