import { runOnlyOnAndroid, runOnlyOnIOS } from '.';
import { DeviceWrapper } from '../../../types/DeviceWrapper';
import { Group, GroupName, User } from '../../../types/testing';
import { newContact } from './create_contact';
import { SupportedPlatformsType } from './open_app';

export const createGroup = async (
  platform: SupportedPlatformsType,
  device1: DeviceWrapper,
  userOne: User,
  device2: DeviceWrapper,
  userTwo: User,
  device3: DeviceWrapper,
  userThree: User,
  userName: GroupName
): Promise<Group> => {
  const group: Group = { userName, userOne, userTwo, userThree };

  const userAMessage = `${userOne.userName} to ${userName}`;
  const userBMessage = `${userTwo.userName} to ${userName}`;
  const userCMessage = `${userThree.userName} to ${userName}`;
  // Create contact between User A and User B
  await newContact(platform, device1, userOne, device2, userTwo);
  await device1.navigateBack(platform);
  await newContact(platform, device1, userOne, device3, userThree);
  await device2.navigateBack(platform);
  // Create contact between User A and User C
  // Exit conversation back to list
  await device1.navigateBack(platform);
  // Exit conversation back to list
  await device3.navigateBack(platform);
  // Click plus button
  await device1.clickOnByAccessibilityID('New conversation button');
  // Select Closed Group option
  await device1.clickOnByAccessibilityID('Create group');
  // Type in group name
  await device1.inputText(userName, { strategy: 'accessibility id', selector: 'Group name input' });
  // Select User B and User C
  await device1.selectByText('Contact', userTwo.userName);
  await device1.selectByText('Contact', userThree.userName);
  // Select tick
  await device1.clickOnByAccessibilityID('Create group');
  // Check for empty state on ios
  // await runOnlyOnIOS(platform, () =>
  //   device1.waitForTextElementToBePresent({
  //     strategy: 'accessibility id',
  //     selector: 'Empty list',
  //     maxWait: 5000,
  //   })
  // );
  await runOnlyOnAndroid(platform, () =>
    device1.waitForControlMessageToBePresent('You created a new group.', 10000)
  );
  // Send message from User A to group to verify all working
  await device1.sendMessage(userAMessage);
  // Did the other devices receive UserA's message?
  await Promise.all([
    device2.clickOnElementAll({
      strategy: 'accessibility id',
      selector: 'Conversation list item',
      text: group.userName,
    }),
    device3.clickOnElementAll({
      strategy: 'accessibility id',
      selector: 'Conversation list item',
      text: group.userName,
    }),
  ]);
  await Promise.all([
    device2.waitForTextElementToBePresent({
      strategy: 'accessibility id',
      selector: 'Message body',
      text: userAMessage,
    }),
    device3.waitForTextElementToBePresent({
      strategy: 'accessibility id',
      selector: 'Message body',
      text: userAMessage,
    }),
  ]);
  // Send message from User B to group
  await device2.sendMessage(userBMessage);
  await Promise.all([
    device1.waitForTextElementToBePresent({
      strategy: 'accessibility id',
      selector: 'Message body',
      text: userBMessage,
    }),
    device3.waitForTextElementToBePresent({
      strategy: 'accessibility id',
      selector: 'Message body',
      text: userBMessage,
    }),
  ]);
  // Send message to User C to group
  await device3.sendMessage(userCMessage);
  await Promise.all([
    device1.waitForTextElementToBePresent({
      strategy: 'accessibility id',
      selector: 'Message body',
      text: userCMessage,
    }),
    device2.waitForTextElementToBePresent({
      strategy: 'accessibility id',
      selector: 'Message body',
      text: userCMessage,
    }),
  ]);
  return { userName, userOne, userTwo, userThree };
};
