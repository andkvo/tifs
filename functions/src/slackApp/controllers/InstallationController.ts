import * as express from "express";

export default class InstallationController {
  async directInstall(req: express.Request, res: express.Response) {
    return res.redirect("somewhere");
  }

  async oauthComplete(req: express.Request, res: express.Response) {
    return res.json(JSON.stringify({ req, env: process.env }));
    //return res.redirect("https://digisec.firebase.com/oauth-complete");
    /*
    Thank you for installing TIFS Text It From Slack

    
    Your client ID is xyz123.

    You need to enter your email address to log in to your account and get started.

    Once you create an account, we will credit it with 
    XX free text messages to try it out.

    No credit card number is required.

    Email Address: ____________________

    == Create Account ==

    Verify Email

    Thank you. Your email address has been verified,
    and your account has been created.

    Your temporary phone number to send and receive texts 
    is 888-555-1212. This number will expire in one hour, so we
    don't have much time.

    If you don't have time to try it out right now, 
    email help@textitfromslack.com to reschedule.

    When you sign up for a paid plan, you'll be able to choose
    a phone number.

    Here are three quick steps to get started:

    1. Create a channel to use for text announcements.
    If you're selling eggs, maybe call it "egg-text"

    2. Add a subscriber using a slash command.
    Type `/subscribe` followed by the phone number to subscribe.
    You can optionally also include a name

    For example, `/subscribe 8885551212 James Slacker`

    3. Send a message in the channel. Everything you send will
    be broadcast as a text message.

    One-on-One Conversations

    Any message sent to your phone number will be routed to a new channel named with the phone number it originated from.

    Try it out:

    1. Send a text message to 888-555-1212

    You should see a new channel created named after the phone number you texted from.

    NOTE: If you would like to change this behavior, email
    help@textitfromslack.com. We have an experimental feature
    to send the message back to the same channel to create a
    discussion group rather than a one-way communication tool.

    Sign Up for a Paid Plan

    That's It! Now that you've tried it out, sign up for a paid
    plan. We'd love to give it away for free, but, alas, phone
    carriers charge us money for this kind of thing.
    
    With a paid plan, you'll get a monthly allowance of text messages. Bulk
    pricing on larger plans allows us to offer much more 
    economical texting rates.
    */
  }
}
