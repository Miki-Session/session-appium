import { closeApp, openAppTwoDevices } from "./utils/open_app";
import { newUser } from "./utils/create_account";
import { newContact } from "./utils/create_contact";

import * as wd from "wd";
import {
  inputText,
  clickOnElement,
  findMessageWithBody,
  findElement,
} from "./utils/utilities";

describe("Message checks", () => {
  it("Unsend message", async () => {
    // Open App
    const { server, device1, device2 } = await openAppTwoDevices();

    // Create two users
    const [userA, userB] = await Promise.all([
      newUser(device1, "User A"),
      newUser(device2, "User B"),
    ]);
    // Create contact
    await newContact(device1, userA, device2, userB);
    // send message from User A to User B
    const unsendMessage = "Test-message-unsending";
    await inputText(device1, "Message input box", unsendMessage);
    // Click send
    await clickOnElement(device1, "Send message button");
    // Long press last sent message
    const foundMessage = await findMessageWithBody(device1, unsendMessage);
    console.info("doing long click on message");

    const action = new wd.TouchAction(device1);
    action.longPress({ el: foundMessage });
    await action.perform();
    // Select Delete icon
    await clickOnElement(device1, "Delete message");
    // Select 'Delete for me and User B'
    await clickOnElement(device1, "Delete for everyone");
    // Look in User B's chat for alert 'This message has been deleted?'
    await findElement(device2, "Deleted message");
    // Excellent
    await closeApp(server, device1, device2);
  });
});