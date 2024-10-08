import { runOnlyOnAndroid, sleepFor } from '.';
import { DeviceWrapper } from '../../../types/DeviceWrapper';
import { User } from '../../../types/testing';
import { SupportedPlatformsType } from './open_app';

export const newContact = async (
  platform: SupportedPlatformsType,
  device1: DeviceWrapper,
  Alice: User,
  device2: DeviceWrapper,
  Bob: User
) => {
  await device1.sendNewMessage(Bob, `${Alice.userName} to ${Bob.userName}`);
  // Click on message request folder
  await sleepFor(100);
  await retryRequest('Message requests banner', platform, device1, device2);
  await device2.clickOnByAccessibilityID('Message requests banner');
  // Select message from User A
  await retryRequest('Message request', platform, device1, device2);
  await device2.clickOnByAccessibilityID('Message request');
  await runOnlyOnAndroid(platform, () =>
    device2.clickOnByAccessibilityID('Accept message request')
  );
  // Type into message input box
  await device2.sendMessage(`Reply-message-${Bob.userName}-to-${Alice.userName}`);
  // Verify config message states message request was accepted
  await device1.waitForControlMessageToBePresent('Your message request has been accepted.');

  console.info(`${Alice.userName} and ${Bob.userName} are now contacts`);
  return { Alice, Bob, device1, device2 };
};

export const retryRequest = async (
  requestType: 'Message requests banner' | 'Message request',
  platform: SupportedPlatformsType,
  device1: DeviceWrapper,
  device2: DeviceWrapper,
  timeout: number = 10000
) => {
  const startTime = Date.now();
  let messageRequest: boolean | null = false;
  if (platform === 'ios') {
    while (!messageRequest && Date.now() - startTime < timeout) {
      const element = await device2.doesElementExist({
        strategy: 'accessibility id',
        selector: requestType,
        maxWait: 1000,
      });

      messageRequest = element !== null;

      if (!messageRequest) {
        await device1.sendMessage('Retry');
        console.log(`Retrying message request`);
        await sleepFor(1000);
      } else {
        console.log('Found message request: No need for retry');
      }
    }

    if (!messageRequest) {
      throw new Error(
        'Message request did not appear within the timeout period: This is a common race condition on iOS.'
      );
    }
  } else {
    console.log('Android: retry functionality not needed');
  }
};
