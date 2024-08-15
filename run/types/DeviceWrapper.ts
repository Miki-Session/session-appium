import { W3CCapabilities } from '@wdio/types/build/Capabilities';
import { AndroidUiautomator2Driver } from 'appium-uiautomator2-driver';
import { XCUITestDriver } from 'appium-xcuitest-driver/build/lib/driver';
import { isArray, isEmpty } from 'lodash';
import {
  ExitUserProfile,
  FirstGif,
  LocatorsInterface,
  PrivacyButton,
  ReadReceiptsButton,
} from '../../run/test/specs/locators';
import { IOS_XPATHS } from '../constants';
import { clickOnCoordinates, sleepFor } from '../test/specs/utils';
import { SupportedPlatformsType } from '../test/specs/utils/open_app';
import { isDeviceAndroid, isDeviceIOS, runScriptAndLog } from '../test/specs/utils/utilities';
import {
  AccessibilityId,
  ControlMessage,
  DMTimeOption,
  DisappearingControlMessage,
  Group,
  InteractionPoints,
  Strategy,
  StrategyExtractionObj,
  User,
  XPath,
} from './testing';

export type Coordinates = {
  x: number;
  y: number;
};
export type ActionSequence = {
  actions: string;
};

type Action = Coordinates & { type: 'pointer'; duration?: number };
type AppiumNextElementType = { ELEMENT: string };

export class DeviceWrapper {
  private readonly device: AndroidUiautomator2Driver | XCUITestDriver;
  public readonly udid: string;

  constructor(device: AndroidUiautomator2Driver | XCUITestDriver, udid: string) {
    this.device = device;
    this.udid = udid;
  }

  /**  === all the shared actions ===  */
  public async click(element: string) {
    // this one works for both devices so just call it without casting it
    return this.toShared().click(element);
  }
  public async doubleClick(elementId: string): Promise<void> {
    return this.toShared().mobileDoubleTap(elementId);
  }

  public async back(): Promise<void> {
    return this.toShared().back();
  }

  public async clear(elementId: string): Promise<void> {
    return this.toShared().clear(elementId);
  }

  public async getText(elementId: string): Promise<string> {
    return this.toShared().getText(elementId);
  }

  public async getDeviceTime(platform: SupportedPlatformsType): Promise<string> {
    return this.toShared().getDeviceTime(platform);
  }

  public async setValueImmediate(text: string, elementId: string): Promise<void> {
    return this.toShared().setValueImmediate(text, elementId);
  }

  public async keys(value: string[]): Promise<void> {
    return this.toShared().keys(value);
  }

  public async getElementRect(
    elementId: string
  ): Promise<undefined | { height: number; width: number; x: number; y: number }> {
    return this.toShared().getElementRect(elementId);
  }

  public async getCssProperty(name: string, elementId: string): Promise<string> {
    return this.toShared().getCssProperty(name, elementId);
  }

  public async scroll(start: Coordinates, end: Coordinates, duration: number): Promise<void> {
    const actions = [
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: start.x, y: start.y },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 500 },
          {
            type: 'pointerMove',
            duration,
            origin: 'pointer',
            x: end.x - start.x,
            y: end.y - start.y,
          },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ];

    await this.toShared().performActions(actions);
  }

  public async pressCoordinates(xCoOrdinates: number, yCoOrdinates: number): Promise<void> {
    const actions = [
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          {
            type: 'pointerMove',
            duration: 0,
            x: xCoOrdinates,
            y: yCoOrdinates,
          },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 200 },

          { type: 'pointerUp', button: 0 },
        ],
      },
    ];

    await this.toShared().performActions(actions);
  }

  public async tap(xCoOrdinates: number, yCoOrdinates: number, duration?: number): Promise<void> {
    const action: Action = {
      type: 'pointer',
      x: xCoOrdinates,
      y: yCoOrdinates,
      duration,
    };
    if (this.isIOS()) {
      await this.toIOS().mobileTap(xCoOrdinates, yCoOrdinates);
      return;
    }
    if (this.isAndroid()) {
      await this.toAndroid().mobileClickGesture({ x: xCoOrdinates, y: yCoOrdinates });
      return;
    }
  }

  public async performActions(actions: ActionSequence): Promise<void> {
    await this.toShared().performActions([actions]);
  }

  public async pushFile(path: string, data: string): Promise<void> {
    console.log('Did file get pushed', path);
    return this.toShared().pushFile(path, data);
  }

  public async getElementScreenshot(elementId: string): Promise<string> {
    return this.toShared().getElementScreenshot(elementId);
  }

  // Session management
  public async createSession(caps: W3CCapabilities): Promise<[string, Record<string, any>]> {
    return this.toShared().createSession(caps);
  }

  public async deleteSession(): Promise<void> {
    return this.toShared().deleteSession();
  }

  public async getPageSource(): Promise<string> {
    return this.toShared().getPageSource();
  }

  /* === all the device-specifc function ===  */

  // ELEMENT INTERACTION

  public async findElement(strategy: Strategy, selector: string): Promise<AppiumNextElementType> {
    return this.toShared().findElement(strategy, selector) as Promise<AppiumNextElementType>;
  }

  public async findElements(
    strategy: Strategy,
    selector: string
  ): Promise<Array<AppiumNextElementType>> {
    return this.toShared().findElements(strategy, selector) as Promise<
      Array<AppiumNextElementType>
    >;
  }

  public async longClick(element: AppiumNextElementType, durationMs: number) {
    if (this.isIOS()) {
      // iOS takes a number in seconds
      const duration = Math.floor(durationMs / 1000);
      return this.toIOS().mobileTouchAndHold(duration, undefined, undefined, element.ELEMENT);
    }
    return this.toAndroid().mobileLongClickGesture({
      elementId: element.ELEMENT,
      duration: durationMs,
    });
  }

  public async clickOnByAccessibilityID(
    accessibilityId: AccessibilityId,
    maxWait?: number
  ): Promise<void> {
    const el = await this.waitForTextElementToBePresent({
      strategy: 'accessibility id',
      selector: accessibilityId,
      maxWait,
    });

    await sleepFor(100);

    if (!el) {
      throw new Error(`Click: Couldnt find accessibilityId: ${accessibilityId}`);
    }
    try {
      await this.click(el.ELEMENT);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'StaleElementReferenceError') {
        console.log('Element is stale, refinding element and attempting second click');
        await this.waitForTextElementToBePresent({
          strategy: 'accessibility id',
          selector: accessibilityId,
          maxWait: 500,
        });
        await this.click(el.ELEMENT);
      }
    }
  }

  public async clickOnElementAll(
    args: ({ text?: string; maxWait?: number } & StrategyExtractionObj) | LocatorsInterface
  ) {
    let el: null | AppiumNextElementType = null;
    let locator: StrategyExtractionObj & { text?: string; maxWait?: number };

    if (args instanceof LocatorsInterface) {
      locator = args.build();
    } else {
      locator = args as StrategyExtractionObj & {
        text?: string;
        maxWait?: number;
      };
    }

    el = await this.waitForTextElementToBePresent({ ...locator });
    await this.click(el.ELEMENT);
    return el;
  }

  public async clickOnElementByText(
    args: { text: string; maxWait?: number } & StrategyExtractionObj
  ) {
    const { text } = args;
    const el = await this.waitForTextElementToBePresent(args);

    if (!el) {
      throw new Error(`clickOnElementByText: Couldnt find text: ${text}`);
    }
    await this.click(el.ELEMENT);
  }

  public async clickOnElementXPath(xpath: XPath, maxWait?: number) {
    await this.waitForTextElementToBePresent({
      strategy: 'xpath',
      selector: xpath,
      maxWait: maxWait,
    });
    const el = await this.findElementByXPath(xpath);

    await this.click(el.ELEMENT);
  }

  public async clickOnElementById(id: string) {
    await this.waitForTextElementToBePresent({ strategy: 'id', selector: id });
    const el = await this.findElement('id', id);
    await this.click(el.ELEMENT);
  }

  public async clickOnTextElementById(id: string, text: string) {
    const el = await this.findTextElementArrayById(id, text);
    await this.waitForTextElementToBePresent({
      strategy: 'id',
      selector: id,
      text,
    });

    await this.click(el.ELEMENT);
  }

  public async clickOnCoordinates(xCoOrdinates: number, yCoOrdinates: number) {
    await this.pressCoordinates(xCoOrdinates, yCoOrdinates);
    console.log(`Tapped coordinates ${xCoOrdinates}, ${yCoOrdinates}`);
  }

  public async tapOnElement(accessibilityId: AccessibilityId) {
    const el = await this.findElementByAccessibilityId(accessibilityId);
    if (!el) {
      throw new Error(`Tap: Couldnt find accessibilityId: ${accessibilityId}`);
    }
    await this.click(el.ELEMENT);
  }

  public async longPress(accessibilityId: AccessibilityId) {
    const el = await this.waitForTextElementToBePresent({
      strategy: 'accessibility id',
      selector: accessibilityId,
    });
    if (!el) {
      throw new Error(`longPress: Could not find accessibilityId: ${accessibilityId}`);
    }
    await this.longClick(el, 2000);
  }

  public async longPressMessage(textToLookFor: string) {
    const maxRetries = 3;
    let attempt = 0;
    let success = false;

    while (attempt < maxRetries && !success) {
      try {
        const el = await this.waitForTextElementToBePresent({
          strategy: 'accessibility id',
          selector: 'Message body',
          text: textToLookFor,
        });

        if (!el) {
          throw new Error(
            `longPress on message: ${textToLookFor} unsuccessful, couldn't find message`
          );
        }

        await this.longClick(el, 3000);
        const longPressSuccess = await this.waitForTextElementToBePresent({
          strategy: 'accessibility id',
          selector: 'Reply to message',
          maxWait: 1000,
        });

        if (longPressSuccess) {
          console.log('LongClick successful');
          success = true; // Exit the loop if successful
        } else {
          throw new Error(`longPress on message: ${textToLookFor} unsuccessful`);
        }
      } catch (error) {
        attempt++;
        if (attempt >= maxRetries) {
          throw new Error(
            `Longpress on message: ${textToLookFor} unsuccessful after ${maxRetries} attempts, ${error}`
          );
        }
        console.log(`Longpress attempt ${attempt} failed. Retrying...`);
        await sleepFor(1000);
      }
    }
  }

  public async longPressConversation(userName: string) {
    const el = await this.waitForTextElementToBePresent({
      strategy: 'accessibility id',
      selector: 'Conversation list item',
      text: userName,
    });
    const maxRetries = 3;
    let attempt = 0;
    let success = false;

    while (attempt < maxRetries && !success) {
      try {
        const el = await this.waitForTextElementToBePresent({
          strategy: 'accessibility id',
          selector: 'Conversation list item',
          text: userName,
        });

        if (!el) {
          throw new Error(
            `longPress on conversation list: ${userName} unsuccessful, couldn't find conversation`
          );
        }

        await this.longClick(el, 3000);
        const longPressSuccess = await this.waitForTextElementToBePresent({
          strategy: 'accessibility id',
          selector: 'Details',
          maxWait: 1000,
        });

        if (longPressSuccess) {
          console.log('LongClick successful');
          success = true; // Exit the loop if successful
        } else {
          throw new Error(`longPress on conversation list: ${userName} unsuccessful`);
        }
      } catch (error) {
        attempt++;
        if (attempt >= maxRetries) {
          throw new Error(
            `Longpress on conversation: ${userName} unsuccessful after ${maxRetries} attempts, ${error}`
          );
        }
        console.log(`Longpress attempt ${attempt} failed. Retrying...`);
        await sleepFor(1000);
      }
    }
    await this.longClick(el, 3000);
  }

  public async pressAndHold(accessibilityId: AccessibilityId) {
    const el = await this.waitForTextElementToBePresent({
      strategy: 'accessibility id',
      selector: accessibilityId,
    });
    await this.longClick(el, 2000);
  }

  public async selectByText(accessibilityId: AccessibilityId, text: string) {
    await this.waitForTextElementToBePresent({
      strategy: 'accessibility id',
      selector: accessibilityId,
      text,
    });
    const selector = await this.findMatchingTextAndAccessibilityId(accessibilityId, text);
    await this.click(selector.ELEMENT);

    return text;
  }

  public async getTextFromElement(element: AppiumNextElementType): Promise<string> {
    const text = await this.getText(element.ELEMENT);

    return text;
  }

  public async grabTextFromAccessibilityId(accessibilityId: AccessibilityId): Promise<string> {
    const elementId = await this.waitForTextElementToBePresent({
      strategy: 'accessibility id',
      selector: accessibilityId,
    });
    const text = await this.getTextFromElement(elementId);
    return text;
  }

  public async deleteText(
    args: ({ text?: string; maxWait?: number } & StrategyExtractionObj) | LocatorsInterface
  ) {
    let el: null | AppiumNextElementType = null;
    let locator: StrategyExtractionObj & { text?: string; maxWait?: number };
    if (args instanceof LocatorsInterface) {
      locator = args.build();
    } else {
      locator = args as StrategyExtractionObj & {
        text?: string;
        maxWait?: number;
      };
    }

    el = await this.waitForTextElementToBePresent({ ...locator });

    let maxRetries = 3;
    let retries = 0;
    let success = false;

    while (retries < maxRetries && !success) {
      await this.longClick(el, 2000);
      if (this.isIOS()) {
        try {
          await this.clickOnElementByText({
            strategy: 'id',
            selector: 'Select All',
            text: 'Select All',
            maxWait: 1000,
          });
          success = true;
        } catch (error) {
          console.info(`Retrying long press and select all, attempt ${retries + 1}`);
        }
      } else {
        await this.longClick(el, 2000);
        success = true;
      }
      retries++;
    }
    if (!success) {
      throw new Error(`Failed to find "Select All" button after ${maxRetries} attempts`);
    }

    await this.clear(el.ELEMENT);

    console.info(`Text has been cleared `);
    return;
  }

  // ELEMENT LOCATORS

  public async findElementByAccessibilityId(
    accessibilityId: AccessibilityId
  ): Promise<AppiumNextElementType> {
    const element = await this.findElement('accessibility id', accessibilityId);
    if (!element || isArray(element)) {
      throw new Error(
        `findElementByAccessibilityId: Did not find accessibilityId: ${accessibilityId} or it was an array `
      );
    }
    return element;
  }

  public async findElementsByAccessibilityId(
    accessibilityId: AccessibilityId
  ): Promise<Array<AppiumNextElementType>> {
    const elements = await this.findElements('accessibility id', accessibilityId);
    if (!elements || !isArray(elements) || isEmpty(elements)) {
      throw new Error(
        `findElementsByAccessibilityId: Did not find accessibilityId: ${accessibilityId} `
      );
    }

    return elements;
  }

  public async findElementByXPath(xpath: XPath) {
    const element = await this.findElement('xpath', xpath);
    if (!element) {
      throw new Error(`findElementByXpath: Did not find xpath: ${xpath}`);
    }

    return element;
  }

  public async findElementByClass(androidClassName: string): Promise<AppiumNextElementType> {
    const element = await this.findElement('class name', androidClassName);
    if (!element) {
      throw new Error(`findElementByClass: Did not find classname: ${androidClassName}`);
    }
    return element;
  }

  public async findElementsByClass(
    androidClassName: string
  ): Promise<Array<AppiumNextElementType>> {
    const elements = await this.findElements('class name', androidClassName);
    if (!elements) {
      throw new Error(`findElementsByClass: Did not find classname: ${androidClassName}`);
    }

    return elements;
  }

  public async findTextElementArrayById(
    id: string,
    textToLookFor: string
  ): Promise<AppiumNextElementType> {
    const elementArray = await this.findElements('id', id);
    const selector = await this.findMatchingTextInElementArray(elementArray, textToLookFor);
    if (!selector) {
      throw new Error(`No matching selector found with text: ${textToLookFor}`);
    }

    return selector;
  }

  public async findMatchingTextAndAccessibilityId(
    accessibilityId: AccessibilityId,
    textToLookFor: string
  ): Promise<AppiumNextElementType> {
    const elements = await this.findElementsByAccessibilityId(accessibilityId);

    const foundElementMatchingText = await this.findMatchingTextInElementArray(
      elements,
      textToLookFor
    );
    if (!foundElementMatchingText) {
      throw new Error(
        `Did not find element with accessibilityId ${accessibilityId} and text body: ${textToLookFor}`
      );
    }

    return foundElementMatchingText;
  }

  public async findMatchingTextInElementArray(
    elements: Array<AppiumNextElementType>,
    textToLookFor: string
  ): Promise<AppiumNextElementType | null> {
    if (elements && elements.length) {
      const matching = await this.findAsync(elements, async e => {
        const text = await this.getTextFromElement(e);
        // console.info(`text ${text} lookigfor ${textToLookFor}`);

        return Boolean(text && text.toLowerCase() === textToLookFor.toLowerCase());
      });

      return matching || null;
    }
    if (!elements) {
      throw new Error(`No elements matching: ${textToLookFor}`);
    }
    return null;
  }

  public async findAsync(
    arr: Array<AppiumNextElementType>,
    asyncCallback: (opts: AppiumNextElementType) => Promise<boolean>
  ): Promise<AppiumNextElementType> {
    const promises = arr.map(asyncCallback);
    const results = await Promise.all(promises);
    const index = results.findIndex(result => result);
    return arr[index];
  }

  public async findLastElementInArray(
    accessibilityId: AccessibilityId
  ): Promise<AppiumNextElementType> {
    const elements = await this.findElementsByAccessibilityId(accessibilityId);

    const [lastElement] = elements.slice(-1);

    if (!elements) {
      throw new Error(`No elements found with ${accessibilityId}`);
    }

    return lastElement;
  }

  public async findMessageWithBody(textToLookFor: string): Promise<AppiumNextElementType> {
    await this.waitForTextElementToBePresent({
      strategy: 'accessibility id',
      selector: 'Message body',
      text: textToLookFor,
    });

    const message = await this.findMatchingTextAndAccessibilityId('Message body', textToLookFor);
    return message;
  }

  public async doesElementExist({
    strategy,
    selector,
    text,
    maxWait,
  }: { text?: string; maxWait?: number } & StrategyExtractionObj) {
    const beforeStart = Date.now();
    const maxWaitMSec = maxWait || 30000;
    const waitPerLoop = 100;
    let element: AppiumNextElementType | null = null;
    while (element === null) {
      try {
        if (!text) {
          element = await this.findElement(strategy, selector);
        } else {
          const els = await this.findElements(strategy, selector);
          element = await this.findMatchingTextInElementArray(els, text);
          if (element) {
            console.log(`${strategy}: ${selector} with matching text ${text} found`);
          } else {
            console.log(`Couldn't find ${text} with matching ${strategy}: ${selector}`);
          }
        }
      } catch (e: any) {
        console.info(`doesElementExist failed with`, e.message, `${strategy} ${selector}`);
      }
      if (!element) {
        await sleepFor(waitPerLoop);
      }
      if (beforeStart + maxWaitMSec <= Date.now()) {
        console.log(selector, " doesn't exist, time expired");
        break;
      } else {
        console.log(selector, "Doesn't exist but retrying");
      }
    }

    return element;
  }

  public async hasElementBeenDeleted({
    text,
    maxWait = 15000,
    ...args
  }: {
    text?: string;
    maxWait?: number;
  } & StrategyExtractionObj) {
    const start = Date.now();
    let element: AppiumNextElementType | undefined = undefined;
    do {
      if (!text) {
        try {
          element = await this.waitForTextElementToBePresent({
            text: text,
            maxWait: 100,
            ...args,
          });
          await sleepFor(100);
          console.log(`Element has been found, waiting for deletion`);
        } catch (e) {
          element = undefined;
          console.log(`Element has been deleted, great success`);
        }
      } else {
        try {
          element = await this.waitForTextElementToBePresent({
            maxWait: 100,
            ...args,
          });
          await sleepFor(100);
          console.log(`Text element has been found, waiting for deletion`);
        } catch (e) {
          element = undefined;
          console.log(`Text element has been deleted, great success`);
        }
      }
    } while (Date.now() - start <= maxWait && element);
  }

  public async hasTextElementBeenDeleted(accessibilityId: AccessibilityId, text: string) {
    const fakeError = `${accessibilityId}: has been found, but shouldn't have been. OOPS`;
    try {
      await this.findMatchingTextAndAccessibilityId(accessibilityId, text);
      throw new Error(fakeError);
    } catch (e: any) {
      if (e.message === fakeError) {
        throw e;
      }
    }
    console.log(accessibilityId, ': ', text, 'is not visible, congratulations');
  }
  // WAIT FOR FUNCTIONS

  public async waitForTextElementToBePresent({
    strategy,
    selector,
    text,
    maxWait,
  }: {
    text?: string;
    maxWait?: number;
  } & StrategyExtractionObj): Promise<AppiumNextElementType> {
    let el: null | AppiumNextElementType = null;
    const maxWaitMSec: number = typeof maxWait === 'number' ? maxWait : 60000;
    let currentWait = 0;
    const waitPerLoop = 100;
    while (el === null) {
      try {
        if (text) {
          console.log(`Waiting for ${strategy}: '${selector}' to be present with ${text}`);
          const els = await this.findElements(strategy, selector);
          el = await this.findMatchingTextInElementArray(els, text);
        } else {
          console.log(`Waiting for '${strategy}' and '${selector}' to be present`);
          el = await this.findElement(strategy, selector);
        }
      } catch (e: any) {
        console.info(
          'waitForTextElementToBePresent threw: ',
          e.message,
          `${strategy}: '${selector}'`
        );
      }

      if (!el) {
        await sleepFor(waitPerLoop);
      }
      currentWait += waitPerLoop;

      if (currentWait >= maxWaitMSec) {
        console.log('Waited too long');
        throw new Error(`Waited for too long looking for '${selector}' and '${text}`);
      }
    }
    console.log(`'${selector}' and '${text}' has been found`);
    return el;
  }

  public async waitForControlMessageToBePresent(
    text: ControlMessage,
    maxWait?: number
  ): Promise<AppiumNextElementType> {
    let el: null | AppiumNextElementType = null;
    const maxWaitMSec: number = typeof maxWait === 'number' ? maxWait : 15000;
    let currentWait = 0;
    const waitPerLoop = 100;
    while (el === null) {
      try {
        console.log(`Waiting for control message to be present with ${text}`);
        const els = await this.findElements('accessibility id', 'Control message');
        el = await this.findMatchingTextInElementArray(els, text);
      } catch (e: any) {
        console.info('waitForControlMessageToBePresent threw: ', e.message);
      }
      if (!el) {
        await sleepFor(waitPerLoop);
      }
      currentWait += waitPerLoop;
      if (currentWait >= maxWaitMSec) {
        console.log('Waited too long');
        throw new Error(`Waited for too long looking for Control message ${text}`);
      }
    }
    console.log(`Control message ${text} has been found`);
    return el;
  }

  public async disappearingControlMessage(
    text: DisappearingControlMessage,
    maxWait?: number
  ): Promise<AppiumNextElementType> {
    let el: null | AppiumNextElementType = null;
    const maxWaitMSec: number = typeof maxWait === 'number' ? maxWait : 15000;
    let currentWait = 0;
    const waitPerLoop = 100;
    while (el === null) {
      try {
        console.log(`Waiting for control message to be present with ${text}`);
        const els = await this.findElements('accessibility id', 'Control message');
        el = await this.findMatchingTextInElementArray(els, text);
      } catch (e: any) {
        console.info('disappearingControlMessage threw: ', e.message);
      }
      if (!el) {
        await sleepFor(waitPerLoop);
      }
      currentWait += waitPerLoop;
      if (currentWait >= maxWaitMSec) {
        console.log('Waited too long');
        throw new Error(`Waited for too long looking for Control message ${text}`);
      }
    }
    console.log(`Control message ${text} has been found`);
    return el;
  }
  // TODO
  public async waitForLoadingMedia() {
    let loadingAnimation: AppiumNextElementType | null = null;

    do {
      try {
        loadingAnimation = await this.waitForTextElementToBePresent({
          strategy: 'id',
          selector: 'network.loki.messenger:id/thumbnail_load_indicator',
          maxWait: 1000,
        });

        if (loadingAnimation) {
          await sleepFor(100);
          console.info('Loading animation was found, waiting for it to be gone');
        }
      } catch (e: any) {
        console.log('Loading animation not found');
        loadingAnimation = null;
      }
    } while (loadingAnimation);

    console.info('Loading animation has finished');
  }

  public async waitForLoadingOnboarding() {
    let loadingAnimation: AppiumNextElementType | null = null;
    do {
      try {
        loadingAnimation = await this.waitForTextElementToBePresent({
          strategy: 'accessibility id',
          selector: 'Loading animation',
          maxWait: 1000,
        });

        if (loadingAnimation) {
          await sleepFor(500);
          console.info('Loading animation was found, waiting for it to be gone');
        }
      } catch (e: any) {
        console.log('Loading animation not found');
        loadingAnimation = null;
      }
    } while (loadingAnimation);

    console.info('Loading animation has finished');
  }

  // UTILITY FUNCTIONS

  public async sendMessage(message: string) {
    await this.inputText(message, { strategy: 'accessibility id', selector: 'Message input box' });

    // Click send

    const sendButton = await this.clickOnElementAll({
      strategy: 'accessibility id',
      selector: 'Send message button',
    });
    if (!sendButton) {
      throw new Error('Send button not found: Need to restart iOS emulator: Known issue');
    }
    // Wait for tick
    await this.waitForTextElementToBePresent({
      strategy: 'accessibility id',
      selector: `Message sent status: Sent`,
      maxWait: 50000,
    });

    return message;
  }

  public async waitForSentConfirmation() {
    let pendingStatus = await this.waitForTextElementToBePresent({
      strategy: 'accessibility id',
      selector: 'Message sent status: Sending',
    });
    let failedStatus = await this.waitForTextElementToBePresent({
      strategy: 'accessibility id',
      selector: 'Message sent status: Failed to send',
    });
    if (pendingStatus || failedStatus) {
      await sleepFor(100);
      pendingStatus = await this.waitForTextElementToBePresent({
        strategy: 'accessibility id',
        selector: 'Message sent status: Sending',
      });
    }
  }

  public async sendNewMessage(user: User, message: string) {
    // Sender workflow
    // Click on plus button
    await this.clickOnByAccessibilityID('New conversation button');
    // Select direct message option
    await this.clickOnByAccessibilityID('New direct message');
    // Enter User B's session ID into input box
    await this.inputText(user.accountID, {
      strategy: 'accessibility id',
      selector: 'Session id input box',
    });
    // Click next
    await this.scrollDown();
    await this.clickOnByAccessibilityID('Next');
    // Type message into message input box

    await this.inputText(message, { strategy: 'accessibility id', selector: 'Message input box' });
    // Click send
    const sendButton = await this.clickOnElementAll({
      strategy: 'accessibility id',
      selector: 'Send message button',
    });
    if (!sendButton) {
      throw new Error('Send button not found: Need to restart iOS emulator: Known issue');
    }
    // Wait for tick

    await this.waitForTextElementToBePresent({
      strategy: 'accessibility id',
      selector: `Message sent status: Sent`,
      maxWait: 50000,
    });

    return message;
  }

  public async sendMessageTo(sender: User, receiver: User | Group) {
    const message = `${sender.userName} to ${receiver.userName}`;
    await this.waitForTextElementToBePresent({
      strategy: 'accessibility id',
      selector: 'Conversation list item',
      text: receiver.userName,
    });
    await sleepFor(100);
    await this.clickOnElementAll({
      strategy: 'accessibility id',
      selector: 'Conversation list item',
      text: receiver.userName,
    });
    console.log(`${sender.userName} + " sent message to ${receiver.userName}`);
    await this.sendMessage(message);
    console.log(`Message received by ${receiver.userName} from ${sender.userName}`);
  }

  public async replyToMessage(user: User, body: string) {
    // Reply to media message from user B
    // Long press on imageSent element
    await this.longPressMessage(body);
    const longPressSuccess = await this.waitForTextElementToBePresent({
      strategy: 'accessibility id',
      selector: 'Reply to message',
    });
    if (longPressSuccess) {
      await this.clickOnByAccessibilityID('Reply to message');
    } else {
      throw new Error(`Long press failed on ${body}`);
    }
    // Select 'Reply' option
    // Send message
    const replyMessage = await this.sendMessage(`${user.userName} + " replied to ${body}`);

    return replyMessage;
  }

  public async measureSendingTime(messageNumber: number) {
    const message = `Test-message`;
    const timeStart = Date.now();

    await this.sendMessage(message);

    const timeEnd = Date.now();
    const timeMs = timeEnd - timeStart;

    console.log(`Message ${messageNumber}: ${timeMs}`);
    return timeMs;
  }

  public async inputText(
    textToInput: string,
    args: ({ maxWait?: number } & StrategyExtractionObj) | LocatorsInterface
  ) {
    let el: null | AppiumNextElementType = null;
    let locator: StrategyExtractionObj & { text?: string; maxWait?: number };

    if (args instanceof LocatorsInterface) {
      locator = args.build();
    } else {
      locator = args as StrategyExtractionObj & {
        text?: string;
        maxWait?: number;
      };
    }

    console.log('Locator being used:', locator);

    el = await this.waitForTextElementToBePresent({ ...locator });
    if (!el) {
      throw new Error(`inputText: Did not find element with locator: ${JSON.stringify(locator)}`);
    }

    await this.setValueImmediate(textToInput, el.ELEMENT);
  }

  public async getAttribute(attribute: string, elementId: string) {
    return this.toShared().getAttribute(attribute, elementId);
  }

  public async disappearRadioButtonSelected(timeOption: DMTimeOption) {
    try {
      const radioButton = await this.findElementByXPath(`//*[./*[@name='${timeOption}']]/*[2]`);

      const attr = await this.getAttribute('value', radioButton.ELEMENT);
      if (attr === 'selected') {
        console.log('Great success - default time is correct');
      } else {
        throw new Error('Dammit - default time was not correct');
      }
    } catch (e) {
      console.log(`Couldn't find radioButton ${timeOption}`);
    }
  }

  // TODO FIX UP THIS FUNCTION
  public async sendImage(platform: SupportedPlatformsType, message?: string, community?: boolean) {
    if (platform === 'ios') {
      const ronSwansonBirthday = '196705060700.00';
      await this.clickOnByAccessibilityID('Attachments button');
      await sleepFor(5000);
      const keyboard = await this.isKeyboardVisible();
      if (keyboard) {
        await clickOnCoordinates(this, InteractionPoints.ImagesFolderKeyboardOpen);
      } else {
        await clickOnCoordinates(this, InteractionPoints.ImagesFolderKeyboardClosed);
      }
      await this.modalPopup({ strategy: 'accessibility id', selector: 'Allow Full Access' });
      const testImage = await this.doesElementExist({
        strategy: 'accessibility id',
        selector: `1967-05-05 21:00:00 +0000`,
        maxWait: 1000,
      });
      if (!testImage) {
        await runScriptAndLog(
          `touch -a -m -t ${ronSwansonBirthday} 'run/test/specs/media/test_image.jpg'`
        );

        await runScriptAndLog(
          `xcrun simctl addmedia ${
            (this as { udid?: string }).udid || ''
          } 'run/test/specs/media/test_image.jpg'`
        );
      }
      await sleepFor(100);
      await this.clickOnByAccessibilityID(`1967-05-05 21:00:00 +0000`, 1000);
      if (message) {
        await this.clickOnByAccessibilityID('Text input box');
        await this.inputText(message, { strategy: 'accessibility id', selector: 'Text input box' });
      }
      await this.clickOnByAccessibilityID('Send button');
      await this.waitForTextElementToBePresent({
        strategy: 'accessibility id',
        selector: 'Message sent status: Sent',
        maxWait: 50000,
      });
    } else {
      await this.clickOnByAccessibilityID('Attachments button');
      await sleepFor(100);
      await this.clickOnByAccessibilityID('Documents folder');
      await this.clickOnByAccessibilityID('Continue');
      await this.clickOnElementAll({
        strategy: 'id',
        selector: 'com.android.permissioncontroller:id/permission_allow_button',
        text: 'Allow',
      });
      await this.clickOnByAccessibilityID('Show roots');
      await sleepFor(100);
      await this.clickOnTextElementById(`android:id/title`, 'Downloads');
      await sleepFor(100);
      const testImage = await this.doesElementExist({
        strategy: 'id',
        selector: 'android:id/title',
        maxWait: 2000,
        text: 'test_image.jpg',
      });
      if (!testImage) {
        await runScriptAndLog(
          `adb -s emulator-5554 push 'run/test/specs/media/test_image.jpg' /storage/emulated/0/Download`,
          true
        );
      }
      await sleepFor(100);
      await this.clickOnTextElementById('android:id/title', 'test_image.jpg');
      if (community) {
        await this.scrollToBottom(platform);
      }
      await this.waitForTextElementToBePresent({
        strategy: 'accessibility id',
        selector: `Message sent status: Sent`,
        maxWait: 60000,
      });
    }
  }

  public async sendImageWithMessageAndroid(message: string) {
    await this.clickOnByAccessibilityID('Attachments button');
    await sleepFor(100);
    await this.clickOnByAccessibilityID('Images folder');
    await this.clickOnByAccessibilityID('Continue');
    await this.clickOnElementAll({
      strategy: 'id',
      selector: 'com.android.permissioncontroller:id/permission_allow_all_button',
      text: 'Allow all',
    });
    await sleepFor(500);
    await this.clickOnElementAll({
      strategy: 'id',
      selector: 'network.loki.messenger:id/mediapicker_folder_item_thumbnail',
    });
    await sleepFor(100);
    await this.clickOnElementAll({
      strategy: 'id',
      selector: 'network.loki.messenger:id/mediapicker_image_item_thumbnail',
    });
    await this.inputText(message, {
      strategy: 'accessibility id',
      selector: 'Message composition',
    });
    await this.clickOnByAccessibilityID('Send');
  }

  public async sendVideoiOS(message: string) {
    const bestDayOfYear = `198809090700.00`;
    await this.clickOnByAccessibilityID('Attachments button');
    // Select images button/tab
    await sleepFor(5000);
    const keyboard = await this.isKeyboardVisible();
    if (keyboard) {
      await clickOnCoordinates(this, InteractionPoints.ImagesFolderKeyboardOpen);
    } else {
      await clickOnCoordinates(this, InteractionPoints.ImagesFolderKeyboardClosed);
    }
    await sleepFor(100);
    // Check if android or ios (android = documents folder/ ios = images folder)
    await this.modalPopup({
      strategy: 'accessibility id',
      selector: 'Allow Full Access',
      maxWait: 500,
    });
    await this.clickOnByAccessibilityID('Recents');
    // Select video
    const videoFolder = await this.doesElementExist({
      strategy: 'xpath',
      selector: IOS_XPATHS.VIDEO_TOGGLE,
      maxWait: 5000,
    });
    if (videoFolder) {
      console.log('Videos folder found');
      await this.clickOnByAccessibilityID('Videos');
      await this.clickOnByAccessibilityID(`1988-09-08 21:00:00 +0000`);
    } else {
      console.log('Videos folder NOT found');
      await runScriptAndLog(
        `touch -a -m -t ${bestDayOfYear} 'run/test/specs/media/test_video.mp4'`,
        true
      );
      await runScriptAndLog(
        `xcrun simctl addmedia ${this.udid || ''} 'run/test/specs/media/test_video.mp4'`,
        true
      );
      await this.clickOnByAccessibilityID(`1988-09-08 21:00:00 +0000`, 5000);
    }
    // Send with message
    await this.clickOnByAccessibilityID('Text input box');
    await this.inputText(message, { strategy: 'accessibility id', selector: 'Text input box' });
    await this.clickOnByAccessibilityID('Send button');
    await this.waitForTextElementToBePresent({
      strategy: 'accessibility id',
      selector: `Message sent status: Sent`,
      maxWait: 10000,
    });
  }

  public async sendVideoAndroid() {
    // Click on attachments button
    await this.clickOnByAccessibilityID('Attachments button');
    await sleepFor(100);
    // Select images button/tab
    await this.clickOnByAccessibilityID('Documents folder');
    await this.clickOnByAccessibilityID('Continue');
    await this.clickOnElementAll({
      strategy: 'id',
      selector: 'com.android.permissioncontroller:id/permission_allow_button',
      text: 'Allow',
    });
    await sleepFor(200);
    // Select video
    const mediaButtons = await this.findElementsByClass('android.widget.Button');
    const videosButton = await this.findMatchingTextInElementArray(mediaButtons, 'Videos');
    if (!videosButton) {
      throw new Error('videosButton was not found');
    }
    await this.click(videosButton.ELEMENT);
    const testVideo = await this.doesElementExist({
      strategy: 'id',
      selector: 'android:id/title',
      maxWait: 1000,
      text: 'test_video.mp4',
    });
    if (!testVideo) {
      // Adds video to downloads folder if it isn't already there
      await runScriptAndLog(
        `adb -s emulator-5554 push 'run/test/specs/media/test_video.mp4' /storage/emulated/0/Download`,
        true
      );
    }
    await sleepFor(100);
    await this.clickOnTextElementById('android:id/title', 'test_video.mp4');
    await this.waitForTextElementToBePresent({
      strategy: 'accessibility id',
      selector: `Message sent status: Sent`,
      maxWait: 50000,
    });
  }

  public async sendDocument(platform: SupportedPlatformsType) {
    if (platform === 'android') {
      await this.clickOnByAccessibilityID('Attachments button');
      await this.clickOnByAccessibilityID('Documents folder');
      await this.clickOnByAccessibilityID('Continue');
      await this.clickOnElementAll({
        strategy: 'id',
        selector: 'com.android.permissioncontroller:id/permission_allow_button',
        text: 'Allow',
      });
      await this.waitForTextElementToBePresent({
        strategy: 'class name',
        selector: 'android.widget.Button',
        text: 'Documents',
      });
      await this.clickOnElementAll({
        strategy: 'class name',
        selector: 'android.widget.Button',
        text: 'Documents',
      });
      const testDocument = await this.doesElementExist({
        strategy: 'id',
        selector: 'android:id/title',
        maxWait: 1000,
        text: 'test_file.pdf',
      });
      if (!testDocument) {
        await runScriptAndLog(
          `adb -s emulator-5554 push 'run/test/specs/media/test_file.pdf' /storage/emulated/0/Download`,
          true
        );
      }
      await sleepFor(1000);
      await this.clickOnTextElementById('android:id/title', 'test_file.pdf');
      await this.waitForTextElementToBePresent({
        strategy: 'accessibility id',
        selector: `Message sent status: Sent`,
        maxWait: 50000,
      });
    }
  }

  public async sendGIF(message: string) {
    await this.clickOnByAccessibilityID('Attachments button');
    if (this.isAndroid()) {
      this.clickOnElementAll({ strategy: 'accessibility id', selector: 'GIF button' });
    }
    if (this.isIOS()) {
      const keyboard = await this.isKeyboardVisible();
      if (keyboard) {
        await clickOnCoordinates(this, InteractionPoints.GifButtonKeyboardOpen);
      } else {
        clickOnCoordinates(this, InteractionPoints.GifButtonKeyboardClosed);
      }
    }
    await this.clickOnByAccessibilityID('Continue', 5000);
    await this.clickOnElementAll(new FirstGif(this));
    if (this.isIOS()) {
      await this.clickOnByAccessibilityID('Text input box');
      await this.inputText(message, {
        strategy: 'accessibility id',
        selector: 'Text input box',
      });
      await this.clickOnByAccessibilityID('Send button');
    }
  }

  public async getTimeFromDevice(platform: SupportedPlatformsType): Promise<string> {
    let timeString = '';
    try {
      let time = await this.getDeviceTime(platform);
      timeString = await time.toString();
      console.log(`Device time: ${timeString}`);
    } catch (e) {
      console.log(`Couldn't get time from device`);
    }
    return timeString;
  }

  public async isKeyboardVisible() {
    if (this.isIOS()) {
      const spaceBar = await this.doesElementExist({
        strategy: 'accessibility id',
        selector: 'space',
        maxWait: 500,
      });
      return Boolean(spaceBar);
    } else {
      console.log(`Not an iOS device: shouldn't use this function`);
    }
  }

  public async mentionContact(platform: SupportedPlatformsType, contact: User) {
    await this.inputText(`@`, { strategy: 'accessibility id', selector: 'Message input box' });
    // Check that all users are showing in mentions box
    await this.waitForTextElementToBePresent({
      strategy: 'accessibility id',
      selector: 'Mentions list',
    });

    // Select User B (Bob) on device 1 (Alice's device)
    if (platform === 'android') {
      await this.clickOnElementAll({
        strategy: 'accessibility id',
        selector: 'Contact mentions',
        text: contact.userName,
      });
    } else {
      await this.clickOnElementAll({
        strategy: 'accessibility id',
        selector: 'Contact',
        text: contact.userName,
      });
    }
    await this.clickOnByAccessibilityID('Send message button');
    await this.waitForTextElementToBePresent({
      strategy: 'accessibility id',
      selector: `Message sent status: Sent`,
    });
  }

  // ACTIONS
  public async swipeLeftAny(selector: AccessibilityId) {
    const el = await this.waitForTextElementToBePresent({
      strategy: 'accessibility id',
      selector,
    });

    const loc = await this.getElementRect(el.ELEMENT);
    console.log(loc);

    if (!loc) {
      throw new Error('did not find element rectangle');
    }
    await this.scroll(
      { x: loc.x + loc.width, y: loc.y + loc.height / 2 },
      { x: loc.x + loc.width / 2, y: loc.y + loc.height / 2 },
      1000
    );

    console.info('Swiped left on ', selector);
  }

  public async swipeLeft(accessibilityId: AccessibilityId, text: string) {
    const el = await this.findMatchingTextAndAccessibilityId(accessibilityId, text);

    const loc = await this.getElementRect(el.ELEMENT);
    console.log(loc);

    if (!loc) {
      throw new Error('did not find element rectangle');
    }
    await this.scroll(
      { x: loc.x + loc.width, y: loc.y + loc.height / 2 },
      { x: loc.x + loc.width / 2, y: loc.y + loc.height / 2 },
      1000
    );

    console.info('Swiped left on ', el);
    // let some time for swipe action to happen and UI to update
  }

  public async scrollDown() {
    await this.scroll({ x: 760, y: 1500 }, { x: 760, y: 710 }, 100);
  }

  public async scrollToBottom(platform: SupportedPlatformsType) {
    if (platform === 'android') {
      await this.clickOnElementAll({
        strategy: 'id',
        selector: 'network.loki.messenger:id/scrollToBottomButton',
      });
    } else {
      await this.clickOnElementAll({
        strategy: 'accessibility id',
        selector: 'Scroll button',
      });
    }
  }

  public async navigateBack(platform: SupportedPlatformsType) {
    if (platform === 'ios') {
      await this.clickOnByAccessibilityID('Back');
    } else {
      await this.clickOnByAccessibilityID('Navigate up');
    }
  }

  /* ======= Settings functions =========*/

  public async turnOnReadReceipts(platform: SupportedPlatformsType) {
    await this.navigateBack(platform);
    await sleepFor(100);
    await this.clickOnByAccessibilityID('User settings');
    await sleepFor(500);
    await this.clickOnElementAll(new PrivacyButton(this));
    await sleepFor(2000);
    await this.clickOnElementAll(new ReadReceiptsButton(this));
    await this.navigateBack(platform);
    await sleepFor(100);
    await this.clickOnElementAll(new ExitUserProfile(this));
  }

  public async checkPermissions(
    selector: Extract<AccessibilityId, 'Allow Full Access' | 'Don’t Allow' | 'Allow'>
  ) {
    if (this.isAndroid()) {
      const permissions = await this.doesElementExist({
        strategy: 'id',
        selector: 'com.android.permissioncontroller:id/permission_deny_button',
        maxWait: 1000,
      });

      if (permissions) {
        this.clickOnElementAll({
          strategy: 'id',
          selector: 'com.android.permissioncontroller:id/permission_deny_button',
        });
      }
      return;
    }
    if (this.isIOS()) {
      // Retrieve the currently active app information
      const activeAppInfo = await this.execute('mobile: activeAppInfo');
      // Switch the active context to the iOS home screen
      await this.updateSettings({
        defaultActiveApplication: 'com.apple.springboard',
      });

      try {
        // Execute the action in the home screen context
        const iosPermissions = await this.doesElementExist({
          strategy: 'accessibility id',
          selector,
          maxWait: 500,
        });
        if (iosPermissions) {
          await this.clickOnByAccessibilityID(selector);
        }
      } catch (e) {
        console.info('iosPermissions doesElementExist failed with: ', e);
        // Ignore any exceptions during the action
      }

      // Revert to the original app context
      await this.updateSettings({
        defaultActiveApplication: activeAppInfo.bundleId,
      });
      return;
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async execute(toExecute: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return (this.device as any).execute(toExecute);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async updateSettings(details: Record<string, any>) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return (this.device as any).updateSettings(details);
  }

  public async modalPopup(
    args: { maxWait?: number } & StrategyExtractionObj,
    maxWait: number = 1000
  ) {
    if (!this.isIOS()) {
      throw new Error('Not an ios device');
    }
    // Retrieve the currently active app information
    const activeAppInfo = await this.execute('mobile: activeAppInfo');
    // Switch the active context to the iOS home screen
    await this.updateSettings({
      defaultActiveApplication: 'com.apple.springboard',
    });

    try {
      // Execute the action in the home screen context
      const iosPermissions = await this.doesElementExist({
        ...args,
        maxWait: 500,
      });
      console.info('iosPermissions', iosPermissions);
      if (iosPermissions) {
        await this.clickOnElementAll({ ...args, maxWait });
      } else {
        console.info('No iosPermissions', iosPermissions);
      }
    } catch (e) {
      console.info('FAILED WITH', e);
      // Ignore any exceptions during the action
    }

    // Revert to the original app context
    await this.updateSettings({
      defaultActiveApplication: activeAppInfo.bundleId,
    });
    return;
  }

  /* === all the utilities function ===  */
  public isIOS(): boolean {
    return isDeviceIOS(this.device);
  }

  public isAndroid(): boolean {
    return isDeviceAndroid(this.device);
  }

  private toIOS(): XCUITestDriver {
    if (!this.isIOS()) {
      throw new Error('Not an ios device');
    }
    return this.device as unknown as XCUITestDriver;
  }

  private toAndroid(): AndroidUiautomator2Driver {
    if (!this.isAndroid()) {
      throw new Error('Not an android device');
    }
    return this.device as unknown as AndroidUiautomator2Driver;
  }

  private toShared(): AndroidUiautomator2Driver & XCUITestDriver {
    return this.device as unknown as AndroidUiautomator2Driver & XCUITestDriver;
  }
}
