import { DISAPPEARING_TIMES } from '../../constants';
import { androidIt, iosIt } from '../../types/sessionIt';
import { DMTimeOption } from '../../types/testing';
import { sleepFor } from './utils';
import { newUser } from './utils/create_account';
import { newContact } from './utils/create_contact';
import { joinCommunity } from './utils/join_community';
import { SupportedPlatformsType, closeApp, openAppTwoDevices } from './utils/open_app';
import { setDisappearingMessage } from './utils/set_disappearing_messages';

iosIt('Disappearing community invite message 1o1', disappearingCommunityInviteMessage1o1Ios);
androidIt(
  'Disappearing community invite message 1o1',
  disappearingCommunityInviteMessage1o1Android
);

async function disappearingCommunityInviteMessage1o1Ios(platform: SupportedPlatformsType) {
  const { device1, device2 } = await openAppTwoDevices(platform);
  const communityLink = `https://chat.lokinet.dev/testing-all-the-things?public_key=1d7e7f92b1ed3643855c98ecac02fc7274033a3467653f047d6e433540c03f17`;
  const communityName = 'Testing All The Things!';
  // Create user A and user B
  const [userA, userB] = await Promise.all([
    newUser(device1, 'Alice', platform),
    newUser(device2, 'Bob', platform),
  ]);
  await newContact(platform, device1, userA, device2, userB);
  await setDisappearingMessage(platform, device1, ['1:1', 'Disappear after read option'], device2);
  // await device1.navigateBack(platform);
  await device1.navigateBack(platform);
  await joinCommunity(platform, device1, communityLink, communityName);
  await device1.clickOnByAccessibilityID('More options');
  await sleepFor(1000);
  await device1.clickOnByAccessibilityID('Add Members');
  await device1.clickOnElementAll({
    strategy: 'accessibility id',
    selector: 'Contact',
    text: userB.userName,
  });
  await device1.clickOnByAccessibilityID('Done');
  // Check device 2 for invitation from user A
  await device2.waitForTextElementToBePresent({
    strategy: 'accessibility id',
    selector: 'Community invitation',
    text: communityName,
  });
  // Wait for 10 seconds for message to disappear
  await sleepFor(30000);
  await Promise.all([
    device2.hasElementBeenDeleted({
      strategy: 'accessibility id',
      selector: 'Message body',
      maxWait: 1000,
      text: communityName,
    }),
    device1.hasElementBeenDeleted({
      strategy: 'accessibility id',
      selector: 'Message body',
      maxWait: 1000,
      text: communityName,
    }),
  ]);
  await closeApp(device1, device2);
}

async function disappearingCommunityInviteMessage1o1Android(platform: SupportedPlatformsType) {
  const { device1, device2 } = await openAppTwoDevices(platform);
  const communityLink = `https://chat.lokinet.dev/testing-all-the-things?public_key=1d7e7f92b1ed3643855c98ecac02fc7274033a3467653f047d6e433540c03f17`;
  const communityName = 'Testing All The Things!';
  // Create user A and user B
  const [userA, userB] = await Promise.all([
    newUser(device1, 'Alice', platform),
    newUser(device2, 'Bob', platform),
  ]);
  await newContact(platform, device1, userA, device2, userB);

  await setDisappearingMessage(platform, device1, ['1:1', 'Disappear after send option'], device2);

  await device1.navigateBack(platform);
  await joinCommunity(platform, device1, communityLink, communityName);
  await device1.clickOnByAccessibilityID('More options');
  await device1.clickOnElementAll({
    strategy: 'id',
    selector: 'network.loki.messenger:id/title',
    text: 'Add members',
  });
  await device1.clickOnElementByText({
    strategy: 'accessibility id',
    selector: 'Contact',
    text: userB.userName,
  });
  await device1.clickOnByAccessibilityID('Done');
  // Check device 2 for invitation from user A
  await device2.waitForTextElementToBePresent({
    strategy: 'id',
    selector: 'network.loki.messenger:id/openGroupTitleTextView',
    text: communityName,
  });
  await device2.clickOnElementAll({
    strategy: 'id',
    selector: 'network.loki.messenger:id/openGroupInvitationIconBackground',
  });
  // Wait for 10 seconds for message to disappear
  await sleepFor(30000);
  await device2.hasElementBeenDeleted({
    strategy: 'accessibility id',
    selector: 'Message body',
    maxWait: 1000,
    text: communityName,
  });
  await device1.hasElementBeenDeleted({
    strategy: 'accessibility id',
    selector: 'Message body',
    maxWait: 1000,
    text: communityName,
  });
  await closeApp(device1, device2);
}
