import { androidIt, iosIt } from '../../types/sessionIt';
import { newUser } from './utils/create_account';
import { newContact } from './utils/create_contact';
import { runOnlyOnAndroid, runOnlyOnIOS, sleepFor } from './utils/index';
import { SupportedPlatformsType, closeApp, openAppTwoDevices } from './utils/open_app';

iosIt('Read status', readStatus);
androidIt('Read status', readStatus);

// bothPlatformsIt("Read status", readStatus);

async function readStatus(platform: SupportedPlatformsType) {
  const { device1, device2 } = await openAppTwoDevices(platform);
  const [userA, userB] = await Promise.all([
    newUser(device1, 'Alice', platform),
    newUser(device2, 'Bob', platform),
  ]);
  const testMessage = 'Testing read status';
  await newContact(platform, device1, userA, device2, userB);
  // Go to settings to turn on read status
  // Device 1
  await Promise.all([device1.turnOnReadReceipts(platform), device2.turnOnReadReceipts(platform)]);
  await device1.clickOnElementAll({
    strategy: 'accessibility id',
    selector: 'Conversation list item',
    text: userB.userName,
  });
  // Send message from User A to User B to verify read status is working
  await device1.sendMessage(testMessage);
  await sleepFor(100);
  await device2.clickOnElementAll({
    strategy: 'accessibility id',
    selector: 'Conversation list item',
    text: userA.userName,
  });
  await device2.waitForTextElementToBePresent({
    strategy: 'accessibility id',
    selector: 'Message body',
    text: testMessage,
  });
  // await device2.clickOnElementAll({
  //   strategy: "accessibility id",
  //   selector: "Message body",
  //   text: testMessage,
  // });
  // Check read status on device 1
  await runOnlyOnAndroid(platform, () =>
    device1.waitForTextElementToBePresent({
      strategy: 'id',
      selector: 'network.loki.messenger:id/messageStatusTextView',
      text: 'Read',
    })
  );
  await runOnlyOnIOS(platform, () =>
    device1.waitForTextElementToBePresent({
      strategy: 'accessibility id',
      selector: 'Message sent status: Read',
    })
  );

  await closeApp(device1, device2);
}

// Typing indicators working
