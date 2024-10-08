import { bothPlatformsIt } from '../../types/sessionIt';
import { sleepFor, runOnlyOnAndroid, runOnlyOnIOS } from './utils';
import { newUser } from './utils/create_account';
import { SupportedPlatformsType, openAppOnPlatformSingleDevice, closeApp } from './utils/open_app';
import { ApplyChanges, ExitUserProfile, TickButton, Username } from './locators';

bothPlatformsIt('Change username', changeUsername);

async function changeUsername(platform: SupportedPlatformsType) {
  const { device } = await openAppOnPlatformSingleDevice(platform);

  const userA = await newUser(device, 'Alice', platform);
  const newUsername = 'Alice in chains';
  // click on settings/profile avatar
  await device.clickOnByAccessibilityID('User settings');
  // select username
  await device.clickOnByAccessibilityID('Username');
  // type in new username
  await sleepFor(100);
  await device.deleteText(new Username(device));
  await device.inputText(newUsername, new Username(device));
  await device.clickOnElementAll(new TickButton(device));
  const changedUsername = await device.grabTextFromAccessibilityId('Username');
  console.log('Changed username', changedUsername);
  if (changedUsername === newUsername) {
    console.log('Username change successful');
  }
  if (changedUsername === userA.userName) {
    console.log('Username is still ', userA.userName);
  }
  if (changedUsername === 'Username') {
    console.log('Username is not picking up text but using access id text', changedUsername);
  } else {
    console.log('Username is not found`');
  }
  // select tick

  await device.clickOnElementAll(new ExitUserProfile(device));
  await device.clickOnElementAll({
    strategy: 'accessibility id',
    selector: 'User settings',
  });
  await device.waitForTextElementToBePresent({
    strategy: 'accessibility id',
    selector: 'Username',
    text: newUsername,
  });
  await closeApp(device);
}
