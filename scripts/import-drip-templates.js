/**
 * import-drip-templates.js
 *
 * Imports the 24 drip campaign templates from Drip_Campaign_Master_Guide.docx
 * into the DWR Email Platform database.
 *
 * Usage on the droplet:
 *   cd /var/www/dwr-email/current
 *   sudo -u www-data bash -c 'set -a; source /var/www/dwr-email/shared/.env; set +a; node import-drip-templates.js'
 *
 * The script:
 *   1. Finds the admin user (or first user if no admin)
 *   2. Creates 24 EmailTemplate records (skips any that already exist by name)
 *   3. Reports how many were created vs. skipped
 *
 * Safe to run multiple times — uses upsert by name.
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const TEMPLATES = [
  {
    "name": "CAMPAIGN 1: Bankruptcy.Forum Announcement",
    "category": "PRESS_MEDIA",
    "subject": "830,000 Americans filed bankruptcy last year. Most could not afford the attorney.",
    "htmlContent": "<p>Hi {{FIRSTNAME}},</p>\n<p>DocWriteReview LLC just launched Bankruptcy.Forum, a platform that gives Americans the tools to prepare their own bankruptcy filing without paying $1,500 to $3,000 in attorney fees.</p>\n<p>The platform includes a free 20-module Chapter 7 video course, guided questionnaire-based document preparation, an AI legal assistant, and complete filing packages starting at $79.</p>\n<p>Bankruptcy filings increased 16% year over year. Consumer debt topped $18 trillion. And the people who need bankruptcy most are the people who cannot afford the attorneys who file it.</p>\n<p>Bankruptcy.Forum was built to close that gap.</p>\n<p>I am happy to provide additional details, screenshots, or an interview with founder Arlene A. Smith-Scott, JD, an author, an advocate, a developer, a juris-doctorate and making a difference for those that are underserved.</p>\n<p>bankruptcy.forum</p>\n<p>Thank you for your time.</p>\n<p>The Team at DocWriteReview</p>\n<p>202-800-1899 | info@docwritereview.com</p>",
    "plainText": "Hi {{FIRSTNAME}},\n\nDocWriteReview LLC just launched Bankruptcy.Forum, a platform that gives Americans the tools to prepare their own bankruptcy filing without paying $1,500 to $3,000 in attorney fees.\n\nThe platform includes a free 20-module Chapter 7 video course, guided questionnaire-based document preparation, an AI legal assistant, and complete filing packages starting at $79.\n\nBankruptcy filings increased 16% year over year. Consumer debt topped $18 trillion. And the people who need bankruptcy most are the people who cannot afford the attorneys who file it.\n\nBankruptcy.Forum was built to close that gap.\n\nI am happy to provide additional details, screenshots, or an interview with founder Arlene A. Smith-Scott, JD, an author, an advocate, a developer, a juris-doctorate and making a difference for those that are underserved.\n\nbankruptcy.forum\n\nThank you for your time.\n\nThe Team at DocWriteReview\n\n202-800-1899 | info@docwritereview.com",
    "campaign": "CAMPAIGN 1: PRESS/MEDIA ANNOUNCEMENT"
  },
  {
    "name": "CAMPAIGN 1: Bankruptcy.Forum Follow-Up",
    "category": "PRESS_MEDIA",
    "subject": "The bankruptcy filing nobody talks about: when the attorney costs more than the debt",
    "htmlContent": "<p>Hi {{FIRSTNAME}},</p>\n<p>Following up on the Bankruptcy.Forum launch. One angle that might interest your readers:</p>\n<p>For Americans with $10,000 to $30,000 in unsecured debt, attorney fees of $1,500 to $3,000 represent 5 to 30 percent of the total debt they are trying to discharge. Bankruptcy.Forum's $79 Chapter 7 filing package changes that math entirely.</p>\n<p>The platform also includes features that did not exist in the DIY bankruptcy space before: an AI legal assistant that answers questions in plain language, a 341 meeting preparation kit, and credit rebuilding resources that start the day the filing is complete.</p>\n<p>I have a one-page fact sheet and high-resolution images available if helpful for your coverage.</p>\n<p>bankruptcy.forum</p>\n<p>The Team at DocWriteReview</p>\n<p>202-800-1899 | info@docwritereview.com</p>",
    "plainText": "Hi {{FIRSTNAME}},\n\nFollowing up on the Bankruptcy.Forum launch. One angle that might interest your readers:\n\nFor Americans with $10,000 to $30,000 in unsecured debt, attorney fees of $1,500 to $3,000 represent 5 to 30 percent of the total debt they are trying to discharge. Bankruptcy.Forum's $79 Chapter 7 filing package changes that math entirely.\n\nThe platform also includes features that did not exist in the DIY bankruptcy space before: an AI legal assistant that answers questions in plain language, a 341 meeting preparation kit, and credit rebuilding resources that start the day the filing is complete.\n\nI have a one-page fact sheet and high-resolution images available if helpful for your coverage.\n\nbankruptcy.forum\n\nThe Team at DocWriteReview\n\n202-800-1899 | info@docwritereview.com",
    "campaign": "CAMPAIGN 1: PRESS/MEDIA ANNOUNCEMENT"
  },
  {
    "name": "CAMPAIGN 1: AnswerTheComplaint Announcement",
    "category": "PRESS_MEDIA",
    "subject": "48% of debt lawsuits end without the defendant responding. A new platform costs $49 to change that.",
    "htmlContent": "<p>Hi {{FIRSTNAME}},</p>\n<p>DocWriteReview LLC launched a second legal self-help platform: AnswerTheComplaint.com.</p>\n<p>Nearly half of all debt collection lawsuits end in default judgment because the defendant never files a response. The result is wage garnishment, frozen bank accounts, and years of credit damage, all because they did not know how to answer or could not afford an attorney to do it.</p>\n<p>AnswerTheComplaint.com provides a flat-fee service of $49 that generates an answer and/or counterclaim with built-in rules and deadlines for all 50 states. The platform identifies the defendant's specific response deadline, walks them through the filing, and can even flag potential FDCPA violations that give grounds for a counterclaim.</p>\n<p>Combined with Bankruptcy.Forum, DocWriteReview now offers two platforms covering the two most common legal crises facing American consumers: overwhelming debt and active lawsuits.</p>\n<p>Interview and media assets available on request.</p>\n<p>answerthecomplaint.com</p>\n<p>The Team at DocWriteReview</p>\n<p>202-800-1899 | info@docwritereview.com</p>",
    "plainText": "Hi {{FIRSTNAME}},\n\nDocWriteReview LLC launched a second legal self-help platform: AnswerTheComplaint.com.\n\nNearly half of all debt collection lawsuits end in default judgment because the defendant never files a response. The result is wage garnishment, frozen bank accounts, and years of credit damage, all because they did not know how to answer or could not afford an attorney to do it.\n\nAnswerTheComplaint.com provides a flat-fee service of $49 that generates an answer and/or counterclaim with built-in rules and deadlines for all 50 states. The platform identifies the defendant's specific response deadline, walks them through the filing, and can even flag potential FDCPA violations that give grounds for a counterclaim.\n\nCombined with Bankruptcy.Forum, DocWriteReview now offers two platforms covering the two most common legal crises facing American consumers: overwhelming debt and active lawsuits.\n\nInterview and media assets available on request.\n\nanswerthecomplaint.com\n\nThe Team at DocWriteReview\n\n202-800-1899 | info@docwritereview.com",
    "campaign": "CAMPAIGN 1: PRESS/MEDIA ANNOUNCEMENT"
  },
  {
    "name": "CAMPAIGN 1: Combined Angle + Seminar",
    "category": "PRESS_MEDIA",
    "subject": "Two platforms. 830,000 filings. One attorney who built what she could not find.",
    "htmlContent": "<p>Hi {{FIRSTNAME}},</p>\n<p>I wanted to share one more angle on the Bankruptcy.Forum and AnswerTheComplaint story that might resonate with your audience.</p>\n<p>Founder Arlene Smith-Scott, JD, did not build these platforms from a boardroom. She is an author, an advocate, and a developer who went through the system herself as a debtor. She saw both sides of the process and built what she wished existed when she needed it.</p>\n<p>On August 29, she is hosting a live webinar called 'Hold On. Don't Panic. You Have the Power to Advocate for Yourself.' It is a 90-minute survival roadmap for anyone who just lost their job, covering the decisions most people get wrong in the first 72 hours. Tickets are $24.95 and include a Financial Crisis Survival Guide.</p>\n<p>If you are covering the intersection of consumer finance, legal access, and self-advocacy, this story hits all three.</p>\n<p>bankruptcy.forum | answerthecomplaint.com</p>\n<p>Seminar: eventbrite.com (search 'Hold On Don't Panic')</p>\n<p>The Team at DocWriteReview</p>\n<p>202-800-1899 | info@docwritereview.com</p>",
    "plainText": "Hi {{FIRSTNAME}},\n\nI wanted to share one more angle on the Bankruptcy.Forum and AnswerTheComplaint story that might resonate with your audience.\n\nFounder Arlene Smith-Scott, JD, did not build these platforms from a boardroom. She is an author, an advocate, and a developer who went through the system herself as a debtor. She saw both sides of the process and built what she wished existed when she needed it.\n\nOn August 29, she is hosting a live webinar called 'Hold On. Don't Panic. You Have the Power to Advocate for Yourself.' It is a 90-minute survival roadmap for anyone who just lost their job, covering the decisions most people get wrong in the first 72 hours. Tickets are $24.95 and include a Financial Crisis Survival Guide.\n\nIf you are covering the intersection of consumer finance, legal access, and self-advocacy, this story hits all three.\n\nbankruptcy.forum | answerthecomplaint.com\n\nSeminar: eventbrite.com (search 'Hold On Don't Panic')\n\nThe Team at DocWriteReview\n\n202-800-1899 | info@docwritereview.com",
    "campaign": "CAMPAIGN 1: PRESS/MEDIA ANNOUNCEMENT"
  },
  {
    "name": "CAMPAIGN 2: Introduction: Your Clients Need This",
    "category": "AFFILIATES",
    "subject": "Your clients are filing bankruptcy without help. There is a better option now.",
    "htmlContent": "<p>Hi {{FIRSTNAME}},</p>\n<p>DocWriteReview LLC launched two platforms built for the people your organization serves every day.</p>\n<p>Bankruptcy.Forum gives individuals the tools to prepare their own Chapter 7 or Chapter 13 bankruptcy filing, with guided questionnaires, a free 20-module video course, and complete filing packages starting at $79. No $1,500 attorney fee. No guesswork.</p>\n<p>AnswerTheComplaint.com provides a flat $49 answer and/or counterclaim for anyone who has been served with a debt collection lawsuit, with built-in rules and deadlines for all 50 states.</p>\n<p>Your clients are already asking you what to do. Now you have two platforms to point them to.</p>\n<p>I will follow up later this week with details on our affiliate partnership program, which includes a 30% commission on every client you refer.</p>\n<p>bankruptcy.forum | answerthecomplaint.com</p>\n<p>The Team at DocWriteReview</p>\n<p>202-800-1899 | info@docwritereview.com</p>",
    "plainText": "Hi {{FIRSTNAME}},\n\nDocWriteReview LLC launched two platforms built for the people your organization serves every day.\n\nBankruptcy.Forum gives individuals the tools to prepare their own Chapter 7 or Chapter 13 bankruptcy filing, with guided questionnaires, a free 20-module video course, and complete filing packages starting at $79. No $1,500 attorney fee. No guesswork.\n\nAnswerTheComplaint.com provides a flat $49 answer and/or counterclaim for anyone who has been served with a debt collection lawsuit, with built-in rules and deadlines for all 50 states.\n\nYour clients are already asking you what to do. Now you have two platforms to point them to.\n\nI will follow up later this week with details on our affiliate partnership program, which includes a 30% commission on every client you refer.\n\nbankruptcy.forum | answerthecomplaint.com\n\nThe Team at DocWriteReview\n\n202-800-1899 | info@docwritereview.com",
    "campaign": "CAMPAIGN 2: AFFILIATE RECRUITMENT"
  },
  {
    "name": "CAMPAIGN 2: The Affiliate Offer",
    "category": "AFFILIATES",
    "subject": "30% commission. 10% discount for your clients. Here is how it works.",
    "htmlContent": "<p>Hi {{FIRSTNAME}},</p>\n<p>Following up on the Bankruptcy.Forum and AnswerTheComplaint platforms I mentioned last week. Here is what the affiliate partnership looks like:</p>\n<p>You earn 30% commission on every client who purchases through your referral link.</p>\n<p>Your clients receive a 10% discount on any package they purchase.</p>\n<p>Here is the math on Bankruptcy.Forum alone:</p>\n<p>Chapter 7 Complete Filing Package: $79. Your client pays $71.10 (10% off). You earn $21.33 (30%).</p>\n<p>Chapter 13 Complete Filing Package: $99. Your client pays $89.10 (10% off). You earn $26.73 (30%).</p>\n<p>Premium Membership: $19.95/month. Your client pays $17.96/month. You earn $5.39/month.</p>\n<p>AnswerTheComplaint: $49 flat fee. Your client pays $44.10. You earn $13.23.</p>\n<p>You refer them. They save. You earn. Nobody falls through the cracks.</p>\n<p>Sign up takes two minutes: bankruptcy.forum/affiliate/login</p>\n<p>The Team at DocWriteReview</p>\n<p>202-800-1899</p>",
    "plainText": "Hi {{FIRSTNAME}},\n\nFollowing up on the Bankruptcy.Forum and AnswerTheComplaint platforms I mentioned last week. Here is what the affiliate partnership looks like:\n\nYou earn 30% commission on every client who purchases through your referral link.\n\nYour clients receive a 10% discount on any package they purchase.\n\nHere is the math on Bankruptcy.Forum alone:\n\nChapter 7 Complete Filing Package: $79. Your client pays $71.10 (10% off). You earn $21.33 (30%).\n\nChapter 13 Complete Filing Package: $99. Your client pays $89.10 (10% off). You earn $26.73 (30%).\n\nPremium Membership: $19.95/month. Your client pays $17.96/month. You earn $5.39/month.\n\nAnswerTheComplaint: $49 flat fee. Your client pays $44.10. You earn $13.23.\n\nYou refer them. They save. You earn. Nobody falls through the cracks.\n\nSign up takes two minutes: bankruptcy.forum/affiliate/login\n\nThe Team at DocWriteReview\n\n202-800-1899",
    "campaign": "CAMPAIGN 2: AFFILIATE RECRUITMENT"
  },
  {
    "name": "CAMPAIGN 2: What Your Clients Actually Get",
    "category": "AFFILIATES",
    "subject": "What your referred clients get when they land on Bankruptcy.Forum",
    "htmlContent": "<p>Hi {{FIRSTNAME}},</p>\n<p>A few people have asked what their clients actually see when they visit Bankruptcy.Forum through an affiliate link. Here is the full picture:</p>\n<p>Free (no purchase required): 20-module Chapter 7 video course covering every step from means test to discharge.</p>\n<p>Complete Filing Packages ($79 Chapter 7, $99 Chapter 13): Guided questionnaires that walk them through every bankruptcy form, built-in rules and deadlines, document preparation ready for court filing.</p>\n<p>Premium Membership ($19.95/month, cancel anytime): AI Legal Assistant for plain-language answers. 341 Meeting Preparation Kit. Credit Rebuilding Roadmap. Creditor Communication Letters. Fresh Start guide as a PDF download.</p>\n<p>A la carte tools ($9.99 to $29.99): Individual tools for specific needs.</p>\n<p>Your clients get the 10% discount on all paid features. You earn 30% on every purchase. And they get tools that most bankruptcy attorneys charge $1,500+ to provide.</p>\n<p>Two-minute sign-up: bankruptcy.forum/affiliate/login</p>\n<p>The Team at DocWriteReview</p>\n<p>202-800-1899</p>",
    "plainText": "Hi {{FIRSTNAME}},\n\nA few people have asked what their clients actually see when they visit Bankruptcy.Forum through an affiliate link. Here is the full picture:\n\nFree (no purchase required): 20-module Chapter 7 video course covering every step from means test to discharge.\n\nComplete Filing Packages ($79 Chapter 7, $99 Chapter 13): Guided questionnaires that walk them through every bankruptcy form, built-in rules and deadlines, document preparation ready for court filing.\n\nPremium Membership ($19.95/month, cancel anytime): AI Legal Assistant for plain-language answers. 341 Meeting Preparation Kit. Credit Rebuilding Roadmap. Creditor Communication Letters. Fresh Start guide as a PDF download.\n\nA la carte tools ($9.99 to $29.99): Individual tools for specific needs.\n\nYour clients get the 10% discount on all paid features. You earn 30% on every purchase. And they get tools that most bankruptcy attorneys charge $1,500+ to provide.\n\nTwo-minute sign-up: bankruptcy.forum/affiliate/login\n\nThe Team at DocWriteReview\n\n202-800-1899",
    "campaign": "CAMPAIGN 2: AFFILIATE RECRUITMENT"
  },
  {
    "name": "CAMPAIGN 2: The Referral You Already Make",
    "category": "AFFILIATES",
    "subject": "You already refer clients to resources. This one pays you.",
    "htmlContent": "<p>Hi {{FIRSTNAME}},</p>\n<p>Your organization already refers clients to legal resources, financial tools, and support services. That is what you do. The difference with the Bankruptcy.Forum affiliate program is that this referral pays you for the work you are already doing.</p>\n<p>Every person you counsel about debt, bankruptcy, or financial hardship is someone who could benefit from a $79 filing package instead of a $1,500 attorney fee. When you refer them through your affiliate link, they save 10% and you earn 30%.</p>\n<p>For AnswerTheComplaint, every person facing a debt collection lawsuit needs to file an answer before their deadline expires. A flat $49 beats a default judgment that costs thousands.</p>\n<p>We track everything through your affiliate dashboard. You see every referral, every purchase, and every commission in real time.</p>\n<p>bankruptcy.forum/affiliate/login</p>\n<p>The Team at DocWriteReview</p>\n<p>202-800-1899</p>",
    "plainText": "Hi {{FIRSTNAME}},\n\nYour organization already refers clients to legal resources, financial tools, and support services. That is what you do. The difference with the Bankruptcy.Forum affiliate program is that this referral pays you for the work you are already doing.\n\nEvery person you counsel about debt, bankruptcy, or financial hardship is someone who could benefit from a $79 filing package instead of a $1,500 attorney fee. When you refer them through your affiliate link, they save 10% and you earn 30%.\n\nFor AnswerTheComplaint, every person facing a debt collection lawsuit needs to file an answer before their deadline expires. A flat $49 beats a default judgment that costs thousands.\n\nWe track everything through your affiliate dashboard. You see every referral, every purchase, and every commission in real time.\n\nbankruptcy.forum/affiliate/login\n\nThe Team at DocWriteReview\n\n202-800-1899",
    "campaign": "CAMPAIGN 2: AFFILIATE RECRUITMENT"
  },
  {
    "name": "CAMPAIGN 2: Final Invitation + Seminar",
    "category": "AFFILIATES",
    "subject": "Last note: the affiliate program and a live seminar your clients should attend",
    "htmlContent": "<p>Hi {{FIRSTNAME}},</p>\n<p>Two things I want to make sure you saw.</p>\n<p>First, the Bankruptcy.Forum affiliate program is open. 30% commission, 10% client discount, two-minute sign-up. If you serve individuals dealing with debt, bankruptcy, or debt collection lawsuits, this puts real tools in their hands and real revenue in yours.</p>\n<p>bankruptcy.forum/affiliate/login</p>\n<p>Second, on August 29, we are hosting a live webinar: 'Hold On. Don't Panic. You Have the Power to Advocate for Yourself.' 90 minutes, plain language, covering the decisions people get wrong in the first 72 hours after losing a job. $24.95 includes a Financial Crisis Survival Guide. This is something you can share with every client walking through your door right now.</p>\n<p>Seminar registration: <a href=\"https://www.eventbrite.com/e/hold-on-dont-panic-you-have-the-power-to-advocate-for-yourself-tickets-1989153616012\">https://www.eventbrite.com/e/hold-on-dont-panic-you-have-the-power-to-advocate-for-yourself-tickets-1989153616012</a></p>\n<p>The Team at DocWriteReview</p>\n<p>202-800-1899 | info@docwritereview.com</p>",
    "plainText": "Hi {{FIRSTNAME}},\n\nTwo things I want to make sure you saw.\n\nFirst, the Bankruptcy.Forum affiliate program is open. 30% commission, 10% client discount, two-minute sign-up. If you serve individuals dealing with debt, bankruptcy, or debt collection lawsuits, this puts real tools in their hands and real revenue in yours.\n\nbankruptcy.forum/affiliate/login\n\nSecond, on August 29, we are hosting a live webinar: 'Hold On. Don't Panic. You Have the Power to Advocate for Yourself.' 90 minutes, plain language, covering the decisions people get wrong in the first 72 hours after losing a job. $24.95 includes a Financial Crisis Survival Guide. This is something you can share with every client walking through your door right now.\n\nSeminar registration: https://www.eventbrite.com/e/hold-on-dont-panic-you-have-the-power-to-advocate-for-yourself-tickets-1989153616012\n\nThe Team at DocWriteReview\n\n202-800-1899 | info@docwritereview.com",
    "campaign": "CAMPAIGN 2: AFFILIATE RECRUITMENT"
  },
  {
    "name": "CAMPAIGN 3: We Have Clients Who Need Your Services",
    "category": "WOMEN_OWNED_BUSINESS",
    "subject": "Women in crisis are searching for your services right now. They cannot find you.",
    "htmlContent": "<p>Hi {{FIRSTNAME}},</p>\n<p>WomenShield.com is a free national resource directory that connects women in crisis with organizations like yours. Right now, women are searching our platform for shelter, childcare, legal aid, healthcare, employment, and financial guidance, and they need to find you.</p>\n<p>WomenShield is not a referral service that charges fees or requires contracts. It is a free directory built so a woman fleeing a dangerous situation can find shelter, childcare, and a job in one search, on one platform, without navigating six different websites.</p>\n<p>If your organization provides services to women, you should be listed on WomenShield. It takes two minutes. It costs nothing. And it puts you in front of women who are actively searching for exactly what you offer.</p>\n<p>Join us in helping women find safety, stability, and a path forward.</p>\n<p>WomenShield.com</p>\n<p>Empowering Her Today. Protecting Her Tomorrow.</p>\n<p>The Team at WomenShield</p>\n<p>202-800-1899 | admin@womenshield.help</p>",
    "plainText": "Hi {{FIRSTNAME}},\n\nWomenShield.com is a free national resource directory that connects women in crisis with organizations like yours. Right now, women are searching our platform for shelter, childcare, legal aid, healthcare, employment, and financial guidance, and they need to find you.\n\nWomenShield is not a referral service that charges fees or requires contracts. It is a free directory built so a woman fleeing a dangerous situation can find shelter, childcare, and a job in one search, on one platform, without navigating six different websites.\n\nIf your organization provides services to women, you should be listed on WomenShield. It takes two minutes. It costs nothing. And it puts you in front of women who are actively searching for exactly what you offer.\n\nJoin us in helping women find safety, stability, and a path forward.\n\nWomenShield.com\n\nEmpowering Her Today. Protecting Her Tomorrow.\n\nThe Team at WomenShield\n\n202-800-1899 | admin@womenshield.help",
    "campaign": "CAMPAIGN 3: WOMENSHIELD PARTNER RECRUITMENT"
  },
  {
    "name": "CAMPAIGN 3: How the Directory Works",
    "category": "WOMEN_OWNED_BUSINESS",
    "subject": "One platform. Eleven categories. Thousands of women searching.",
    "htmlContent": "<p>Hi {{FIRSTNAME}},</p>\n<p>I wanted to share a bit more about how WomenShield works and why your organization's listing matters.</p>\n<p>WomenShield organizes resources across 11 categories: Shelter and Housing, Childcare, Education, Employment, Healthcare, Legal Resources, Spiritual Healing, Supportive Growth and Counseling, Women and Money, Women-Owned Businesses, and Funding and Grants.</p>\n<p>When a woman visits WomenShield, she can search by category and by state. She can also talk to Shieldie, our AI resource guide, who helps her find the right resource with one tap. If she needs shelter and childcare and a job, she finds all three in one session without opening another browser tab.</p>\n<p>Your organization's listing includes your name, contact information, website, location, and a description of your services. Women searching in your state and your category find you directly.</p>\n<p>Free listing, two minutes: WomenShield.com</p>\n<p>The Team at WomenShield</p>\n<p>202-800-1899</p>",
    "plainText": "Hi {{FIRSTNAME}},\n\nI wanted to share a bit more about how WomenShield works and why your organization's listing matters.\n\nWomenShield organizes resources across 11 categories: Shelter and Housing, Childcare, Education, Employment, Healthcare, Legal Resources, Spiritual Healing, Supportive Growth and Counseling, Women and Money, Women-Owned Businesses, and Funding and Grants.\n\nWhen a woman visits WomenShield, she can search by category and by state. She can also talk to Shieldie, our AI resource guide, who helps her find the right resource with one tap. If she needs shelter and childcare and a job, she finds all three in one session without opening another browser tab.\n\nYour organization's listing includes your name, contact information, website, location, and a description of your services. Women searching in your state and your category find you directly.\n\nFree listing, two minutes: WomenShield.com\n\nThe Team at WomenShield\n\n202-800-1899",
    "campaign": "CAMPAIGN 3: WOMENSHIELD PARTNER RECRUITMENT"
  },
  {
    "name": "CAMPAIGN 3: The Woman You Serve Is Already Searching",
    "category": "WOMEN_OWNED_BUSINESS",
    "subject": "She found a shelter last night. Today she needs what you provide.",
    "htmlContent": "<p>Hi {{FIRSTNAME}},</p>\n<p>Let me describe the woman who visits WomenShield.</p>\n<p>She left a dangerous home with her children. She found a shelter last night through the WomenShield directory. This morning she needs childcare so she can go to a job interview. Tomorrow she needs legal aid to file a protective order. Next week she needs financial guidance to open a bank account her abuser cannot access.</p>\n<p>Every one of those needs is a category on WomenShield. Every one of those categories needs organizations like yours listed so she can find you.</p>\n<p>She does not have time to call 10 phone numbers and sit on hold. She needs one platform where everything connects. That is what WomenShield provides. But it only works if the organizations are there when she searches.</p>\n<p>Be there when she searches. WomenShield.com</p>\n<p>Empowering Her Today. Protecting Her Tomorrow.</p>\n<p>The Team at WomenShield</p>",
    "plainText": "Hi {{FIRSTNAME}},\n\nLet me describe the woman who visits WomenShield.\n\nShe left a dangerous home with her children. She found a shelter last night through the WomenShield directory. This morning she needs childcare so she can go to a job interview. Tomorrow she needs legal aid to file a protective order. Next week she needs financial guidance to open a bank account her abuser cannot access.\n\nEvery one of those needs is a category on WomenShield. Every one of those categories needs organizations like yours listed so she can find you.\n\nShe does not have time to call 10 phone numbers and sit on hold. She needs one platform where everything connects. That is what WomenShield provides. But it only works if the organizations are there when she searches.\n\nBe there when she searches. WomenShield.com\n\nEmpowering Her Today. Protecting Her Tomorrow.\n\nThe Team at WomenShield",
    "campaign": "CAMPAIGN 3: WOMENSHIELD PARTNER RECRUITMENT"
  },
  {
    "name": "CAMPAIGN 3: Final Invitation",
    "category": "WOMEN_OWNED_BUSINESS",
    "subject": "Last note: your free listing on WomenShield and a live seminar for your clients",
    "htmlContent": "<p>Hi {{FIRSTNAME}},</p>\n<p>I am following up one more time because the women your organization serves deserve to find you when they search.</p>\n<p>WomenShield.com is a free national resource directory. A listing takes two minutes. It costs nothing. And it connects your organization to women actively searching for exactly the services you provide.</p>\n<p>We also wanted to let you know about a live webinar on August 29: 'Hold On. Don't Panic. You Have the Power to Advocate for Yourself.' It is a 90-minute survival roadmap for anyone facing a financial crisis, covering bankruptcy, debt defense, and the decisions that matter most in the first 72 hours. $24.95 includes a Financial Crisis Survival Guide. This may be something your clients and staff would benefit from.</p>\n<p>WomenShield.com | Seminar: <a href=\"https://www.eventbrite.com/e/hold-on-dont-panic-you-have-the-power-to-advocate-for-yourself-tickets-1989153616012\">https://www.eventbrite.com/e/hold-on-dont-panic-you-have-the-power-to-advocate-for-yourself-tickets-1989153616012</a></p>\n<p>Empowering Her Today. Protecting Her Tomorrow.</p>\n<p>The Team at WomenShield</p>\n<p>202-800-1899 | admin@womenshield.help</p>",
    "plainText": "Hi {{FIRSTNAME}},\n\nI am following up one more time because the women your organization serves deserve to find you when they search.\n\nWomenShield.com is a free national resource directory. A listing takes two minutes. It costs nothing. And it connects your organization to women actively searching for exactly the services you provide.\n\nWe also wanted to let you know about a live webinar on August 29: 'Hold On. Don't Panic. You Have the Power to Advocate for Yourself.' It is a 90-minute survival roadmap for anyone facing a financial crisis, covering bankruptcy, debt defense, and the decisions that matter most in the first 72 hours. $24.95 includes a Financial Crisis Survival Guide. This may be something your clients and staff would benefit from.\n\nWomenShield.com | Seminar: https://www.eventbrite.com/e/hold-on-dont-panic-you-have-the-power-to-advocate-for-yourself-tickets-1989153616012\n\nEmpowering Her Today. Protecting Her Tomorrow.\n\nThe Team at WomenShield\n\n202-800-1899 | admin@womenshield.help",
    "campaign": "CAMPAIGN 3: WOMENSHIELD PARTNER RECRUITMENT"
  },
  {
    "name": "CAMPAIGN 4: Your Software Bill Is Eating Your Grant Budget",
    "category": "NONPROFIT",
    "subject": "Your organization spends $18,000 to $36,000 a year on software it will never own",
    "htmlContent": "<p>Hi {{FIRSTNAME}},</p>\n<p>DocWriteReview builds custom web platforms for nonprofits and organizations that are tired of paying $1,500 to $3,000 per month for software subscriptions they will never own.</p>\n<p>CRM. Grant tracking. Client portal. Reporting. Scheduling. Donor management. Add them up. Multiply by 12. For most organizations, that number falls between $18,000 and $36,000 per year. Over five years, that is $90,000 to $180,000 in software rental, money that could be funding your programs instead.</p>\n<p>We build one integrated platform with your branding, your tools, and your workflows. You pay once. You own it. No monthly fees. No price increases. No vendor deciding to discontinue the feature your team depends on.</p>\n<p>$3,995 one-time vs. $18,000 to $36,000 per year. The platform pays for itself in 2 to 3 months.</p>\n<p>DocWriteReview.com | 202-800-1899</p>\n<p>Web Solutions for Real Problems.</p>",
    "plainText": "Hi {{FIRSTNAME}},\n\nDocWriteReview builds custom web platforms for nonprofits and organizations that are tired of paying $1,500 to $3,000 per month for software subscriptions they will never own.\n\nCRM. Grant tracking. Client portal. Reporting. Scheduling. Donor management. Add them up. Multiply by 12. For most organizations, that number falls between $18,000 and $36,000 per year. Over five years, that is $90,000 to $180,000 in software rental, money that could be funding your programs instead.\n\nWe build one integrated platform with your branding, your tools, and your workflows. You pay once. You own it. No monthly fees. No price increases. No vendor deciding to discontinue the feature your team depends on.\n\n$3,995 one-time vs. $18,000 to $36,000 per year. The platform pays for itself in 2 to 3 months.\n\nDocWriteReview.com | 202-800-1899\n\nWeb Solutions for Real Problems.",
    "campaign": "CAMPAIGN 4: DOCWRITEREVIEW SAAS — NONPROFITS"
  },
  {
    "name": "CAMPAIGN 4: The GFR Grant Management Platform",
    "category": "NONPROFIT",
    "subject": "Federal grants just got harder to keep. Your tracking system is the difference.",
    "htmlContent": "<p>Hi {{FIRSTNAME}},</p>\n<p>Federal agencies are facing 40%+ budget reductions. 87% of foundation leaders report increased demand. The grants that remain have stricter reporting requirements than ever before.</p>\n<p>In this environment, a missed deadline is a revoked grant. A missing financial report is a clawed-back award. The organizations that survive will be the ones that can document every dollar, every deliverable, and every outcome.</p>\n<p>DocWriteReview's GFR platform is a 19-module grant management application built for organizations managing multiple funding sources simultaneously. It tracks proposals, budgets, reporting deadlines, and funder relationships in one dashboard.</p>\n<p>One-time purchase. $3,995. No subscriptions. No recurring costs. You own the platform and your compliance data lives where you decide, not on a vendor's server.</p>\n<p>dwrgrantmgmt.site | DocWriteReview.com | 202-800-1899</p>",
    "plainText": "Hi {{FIRSTNAME}},\n\nFederal agencies are facing 40%+ budget reductions. 87% of foundation leaders report increased demand. The grants that remain have stricter reporting requirements than ever before.\n\nIn this environment, a missed deadline is a revoked grant. A missing financial report is a clawed-back award. The organizations that survive will be the ones that can document every dollar, every deliverable, and every outcome.\n\nDocWriteReview's GFR platform is a 19-module grant management application built for organizations managing multiple funding sources simultaneously. It tracks proposals, budgets, reporting deadlines, and funder relationships in one dashboard.\n\nOne-time purchase. $3,995. No subscriptions. No recurring costs. You own the platform and your compliance data lives where you decide, not on a vendor's server.\n\ndwrgrantmgmt.site | DocWriteReview.com | 202-800-1899",
    "campaign": "CAMPAIGN 4: DOCWRITEREVIEW SAAS — NONPROFITS"
  },
  {
    "name": "CAMPAIGN 4: Three Proposals for the Price of One",
    "category": "NONPROFIT",
    "subject": "One grant proposal is a coin flip. Three is a strategy.",
    "htmlContent": "<p>Hi {{FIRSTNAME}},</p>\n<p>Beyond the technology platform, DocWriteReview also writes grant proposals.</p>\n<p>We deliver three complete grant proposals with full financials for the price of one. Each proposal is targeted to a different funder with customized budget narratives, evaluation frameworks, and evidence-based strategies. Your odds of funding triple. Your cost stays the same.</p>\n<p>In a funding environment where every dollar has more organizations competing for it, submitting one proposal at a time is not a strategy. It is a coin flip with your mission on the line.</p>\n<p>If your organization needs funding in the next 6 months, the first conversation is free.</p>\n<p>docwritereview.com/grant-intake | 202-800-1899</p>\n<p>We Build. You Grow. Together We Win.</p>",
    "plainText": "Hi {{FIRSTNAME}},\n\nBeyond the technology platform, DocWriteReview also writes grant proposals.\n\nWe deliver three complete grant proposals with full financials for the price of one. Each proposal is targeted to a different funder with customized budget narratives, evaluation frameworks, and evidence-based strategies. Your odds of funding triple. Your cost stays the same.\n\nIn a funding environment where every dollar has more organizations competing for it, submitting one proposal at a time is not a strategy. It is a coin flip with your mission on the line.\n\nIf your organization needs funding in the next 6 months, the first conversation is free.\n\ndocwritereview.com/grant-intake | 202-800-1899\n\nWe Build. You Grow. Together We Win.",
    "campaign": "CAMPAIGN 4: DOCWRITEREVIEW SAAS — NONPROFITS"
  },
  {
    "name": "CAMPAIGN 4: Free Consultation + Seminar",
    "category": "NONPROFIT",
    "subject": "Let us show you what a custom platform looks like for your organization",
    "htmlContent": "<p>Hi {{FIRSTNAME}},</p>\n<p>I wanted to make sure you saw the two things we can do for your organization right now.</p>\n<p>First, a custom web platform that replaces your monthly software subscriptions with one owned system. Your branding. Your CRM. Your client portal. Your grant tracking. $3,995 once, yours forever. We schedule a free consultation, learn how your organization works, and show you exactly what the platform would look like for your specific needs.</p>\n<p>Second, grant proposals that win. Three complete proposals with full financials for the price of one. Targeted to different funders. Written in your voice with real numbers that reviewers trust.</p>\n<p>And if your staff or clients are facing financial hardship personally, share this: On August 29, we are hosting 'Hold On. Don't Panic.' A 90-minute live webinar on surviving a financial crisis. $24.95.</p>\n<p>Free consultation: calendly.com/docwritereview-info/new-meeting</p>\n<p>Seminar: <a href=\"https://www.eventbrite.com/e/hold-on-dont-panic-you-have-the-power-to-advocate-for-yourself-tickets-1989153616012\">https://www.eventbrite.com/e/hold-on-dont-panic-you-have-the-power-to-advocate-for-yourself-tickets-1989153616012</a></p>\n<p>DocWriteReview.com | 202-800-1899</p>\n<p>Web Solutions for Real Problems.</p>",
    "plainText": "Hi {{FIRSTNAME}},\n\nI wanted to make sure you saw the two things we can do for your organization right now.\n\nFirst, a custom web platform that replaces your monthly software subscriptions with one owned system. Your branding. Your CRM. Your client portal. Your grant tracking. $3,995 once, yours forever. We schedule a free consultation, learn how your organization works, and show you exactly what the platform would look like for your specific needs.\n\nSecond, grant proposals that win. Three complete proposals with full financials for the price of one. Targeted to different funders. Written in your voice with real numbers that reviewers trust.\n\nAnd if your staff or clients are facing financial hardship personally, share this: On August 29, we are hosting 'Hold On. Don't Panic.' A 90-minute live webinar on surviving a financial crisis. $24.95.\n\nFree consultation: calendly.com/docwritereview-info/new-meeting\n\nSeminar: https://www.eventbrite.com/e/hold-on-dont-panic-you-have-the-power-to-advocate-for-yourself-tickets-1989153616012\n\nDocWriteReview.com | 202-800-1899\n\nWeb Solutions for Real Problems.",
    "campaign": "CAMPAIGN 4: DOCWRITEREVIEW SAAS — NONPROFITS"
  },
  {
    "name": "CAMPAIGN 5: Your Firm Turned Down a Case Last Month",
    "category": "LAWYERS",
    "subject": "The case had merit. The fee was good. Nobody had time for the brief.",
    "htmlContent": "<p>Hi {{FIRSTNAME}},</p>\n<p>DocWriteReview writes appellate briefs for small and mid-size law firms that want to say yes to more cases without adding overhead.</p>\n<p>The scenario is the same at every firm. A client calls with an appellate case. It has merit. The fee is significant. But every associate is buried in active litigation. Nobody has time for the research, the writing, and the filing deadline. The partner says no. The client goes to another firm. The revenue walks out the door.</p>\n<p>I handle the brief from research to filing, delivered to your specifications, under a flat fee you know before you take the case. Your firm keeps the client relationship. Your firm keeps the revenue. I do the writing.</p>\n<p>30 years of legal experience. Flat fee per brief. No hourly surprises.</p>\n<p>DocWriteReview.com | 202-800-1899</p>",
    "plainText": "Hi {{FIRSTNAME}},\n\nDocWriteReview writes appellate briefs for small and mid-size law firms that want to say yes to more cases without adding overhead.\n\nThe scenario is the same at every firm. A client calls with an appellate case. It has merit. The fee is significant. But every associate is buried in active litigation. Nobody has time for the research, the writing, and the filing deadline. The partner says no. The client goes to another firm. The revenue walks out the door.\n\nI handle the brief from research to filing, delivered to your specifications, under a flat fee you know before you take the case. Your firm keeps the client relationship. Your firm keeps the revenue. I do the writing.\n\n30 years of legal experience. Flat fee per brief. No hourly surprises.\n\nDocWriteReview.com | 202-800-1899",
    "campaign": "CAMPAIGN 5: DOCWRITEREVIEW SAAS — LAW FIRMS"
  },
  {
    "name": "CAMPAIGN 5: LegalCommand: Your Firm's Platform",
    "category": "LAWYERS",
    "subject": "Your firm pays $2,000 a month for software with someone else's logo on it",
    "htmlContent": "<p>Hi {{FIRSTNAME}},</p>\n<p>Beyond appellate briefs, DocWriteReview also builds legal practice management platforms for solo attorneys and small firms.</p>\n<p>LegalCommand replaces the software your firm currently rents: case tracking, document management, client portal, scheduling, and billing. One platform. Your firm's branding. Your data living where you decide.</p>\n<p>The average small firm pays $1,500 to $3,000 per month in combined software subscriptions. LegalCommand costs $3,995 once. No monthly fees. No price increases. No vendor lock-in.</p>\n<p>Your clients should see your firm's name when they log in. Not Clio. Not MyCase. Not someone else's brand.</p>\n<p>dwrlegal.site | DocWriteReview.com | 202-800-1899</p>",
    "plainText": "Hi {{FIRSTNAME}},\n\nBeyond appellate briefs, DocWriteReview also builds legal practice management platforms for solo attorneys and small firms.\n\nLegalCommand replaces the software your firm currently rents: case tracking, document management, client portal, scheduling, and billing. One platform. Your firm's branding. Your data living where you decide.\n\nThe average small firm pays $1,500 to $3,000 per month in combined software subscriptions. LegalCommand costs $3,995 once. No monthly fees. No price increases. No vendor lock-in.\n\nYour clients should see your firm's name when they log in. Not Clio. Not MyCase. Not someone else's brand.\n\ndwrlegal.site | DocWriteReview.com | 202-800-1899",
    "campaign": "CAMPAIGN 5: DOCWRITEREVIEW SAAS — LAW FIRMS"
  },
  {
    "name": "CAMPAIGN 5: The Math on Ownership",
    "category": "LAWYERS",
    "subject": "$3,995 once or $36,000 per year. The math is not complicated.",
    "htmlContent": "<p>Hi {{FIRSTNAME}},</p>\n<p>I want to lay out the math plainly because the numbers speak for themselves.</p>\n<p>If your firm pays $2,000 per month in combined software subscriptions, that is $24,000 per year. Over 5 years, $120,000. You own nothing at the end. If a vendor raises prices, you pay. If a vendor shuts down, your data may go with them.</p>\n<p>LegalCommand: $3,995 one-time. Same capabilities. Your brand. Your data. Yours forever.</p>\n<p>The platform integrates Stripe for payments, Google Workspace for email and calendar, Calendly for scheduling, and whatever tools your firm already uses.</p>\n<p>The platform pays for itself in less than 2 months. Everything after that is money your firm keeps.</p>\n<p>Free consultation: calendly.com/docwritereview-info/new-meeting</p>\n<p>DocWriteReview.com | 202-800-1899</p>",
    "plainText": "Hi {{FIRSTNAME}},\n\nI want to lay out the math plainly because the numbers speak for themselves.\n\nIf your firm pays $2,000 per month in combined software subscriptions, that is $24,000 per year. Over 5 years, $120,000. You own nothing at the end. If a vendor raises prices, you pay. If a vendor shuts down, your data may go with them.\n\nLegalCommand: $3,995 one-time. Same capabilities. Your brand. Your data. Yours forever.\n\nThe platform integrates Stripe for payments, Google Workspace for email and calendar, Calendly for scheduling, and whatever tools your firm already uses.\n\nThe platform pays for itself in less than 2 months. Everything after that is money your firm keeps.\n\nFree consultation: calendly.com/docwritereview-info/new-meeting\n\nDocWriteReview.com | 202-800-1899",
    "campaign": "CAMPAIGN 5: DOCWRITEREVIEW SAAS — LAW FIRMS"
  },
  {
    "name": "CAMPAIGN 5: Free Consultation + Seminar",
    "category": "LAWYERS",
    "subject": "Two things that could change your firm's bottom line this quarter",
    "htmlContent": "<p>Hi {{FIRSTNAME}},</p>\n<p>Two things I want to make sure you saw.</p>\n<p>First, appellate brief outsourcing. Flat fee, research to filing, your specifications. If your firm has turned down even one case in the last year because of bandwidth, that is revenue you did not have to lose. 30 years of legal experience behind every brief.</p>\n<p>Second, LegalCommand. One platform replacing your monthly subscriptions. Your brand, your data, $3,995 once. Schedule a free consultation and I will show you exactly what it looks like for your firm.</p>\n<p>And for your clients facing financial hardship: our August 29 webinar, 'Hold On. Don't Panic,' covers bankruptcy, debt defense, and the financial decisions that matter most after a job loss. 90 minutes, $24.95. A resource worth sharing with clients in crisis.</p>\n<p>Free consultation: calendly.com/docwritereview-info/new-meeting</p>\n<p>Seminar: <a href=\"https://www.eventbrite.com/e/hold-on-dont-panic-you-have-the-power-to-advocate-for-yourself-tickets-1989153616012\">https://www.eventbrite.com/e/hold-on-dont-panic-you-have-the-power-to-advocate-for-yourself-tickets-1989153616012</a></p>\n<p>DocWriteReview.com | 202-800-1899</p>",
    "plainText": "Hi {{FIRSTNAME}},\n\nTwo things I want to make sure you saw.\n\nFirst, appellate brief outsourcing. Flat fee, research to filing, your specifications. If your firm has turned down even one case in the last year because of bandwidth, that is revenue you did not have to lose. 30 years of legal experience behind every brief.\n\nSecond, LegalCommand. One platform replacing your monthly subscriptions. Your brand, your data, $3,995 once. Schedule a free consultation and I will show you exactly what it looks like for your firm.\n\nAnd for your clients facing financial hardship: our August 29 webinar, 'Hold On. Don't Panic,' covers bankruptcy, debt defense, and the financial decisions that matter most after a job loss. 90 minutes, $24.95. A resource worth sharing with clients in crisis.\n\nFree consultation: calendly.com/docwritereview-info/new-meeting\n\nSeminar: https://www.eventbrite.com/e/hold-on-dont-panic-you-have-the-power-to-advocate-for-yourself-tickets-1989153616012\n\nDocWriteReview.com | 202-800-1899",
    "campaign": "CAMPAIGN 5: DOCWRITEREVIEW SAAS — LAW FIRMS"
  },
  {
    "name": "CAMPAIGN 6: Announcement: 18 Days Out",
    "category": "GENERAL_BUSINESS",
    "subject": "You just lost your job. The decisions you make this week will cost you or save you.",
    "htmlContent": "<p>Hi {{FIRSTNAME}},</p>\n<p>On August 29, DocWriteReview is hosting a live webinar that could change how your clients, your colleagues, or you personally handle a financial crisis.</p>\n<p>'Hold On. Don't Panic. You Have the Power to Advocate for Yourself.'</p>\n<p>90 minutes. Plain language. Real law. Led by Arlene A. Smith-Scott, JD, an author, an advocate, and a developer who has been on both sides of the bankruptcy system.</p>\n<p>What it covers: the three decisions most people get wrong in the first 72 hours after losing a job. Your 401(k) and why you should not touch it. The automatic stay and what it protects. When to file bankruptcy, when to answer a lawsuit, and when to do nothing.</p>\n<p>$24.95. Includes a Financial Crisis Survival Guide.</p>\n<p>Saturday, August 29 | 10:00 AM to 11:30 AM Pacific | Online</p>\n<p>Register: <a href=\"https://www.eventbrite.com/e/hold-on-dont-panic-you-have-the-power-to-advocate-for-yourself-tickets-1989153616012\">https://www.eventbrite.com/e/hold-on-dont-panic-you-have-the-power-to-advocate-for-yourself-tickets-1989153616012</a></p>\n<p>The Team at DocWriteReview</p>\n<p>202-800-1899</p>",
    "plainText": "Hi {{FIRSTNAME}},\n\nOn August 29, DocWriteReview is hosting a live webinar that could change how your clients, your colleagues, or you personally handle a financial crisis.\n\n'Hold On. Don't Panic. You Have the Power to Advocate for Yourself.'\n\n90 minutes. Plain language. Real law. Led by Arlene A. Smith-Scott, JD, an author, an advocate, and a developer who has been on both sides of the bankruptcy system.\n\nWhat it covers: the three decisions most people get wrong in the first 72 hours after losing a job. Your 401(k) and why you should not touch it. The automatic stay and what it protects. When to file bankruptcy, when to answer a lawsuit, and when to do nothing.\n\n$24.95. Includes a Financial Crisis Survival Guide.\n\nSaturday, August 29 | 10:00 AM to 11:30 AM Pacific | Online\n\nRegister: https://www.eventbrite.com/e/hold-on-dont-panic-you-have-the-power-to-advocate-for-yourself-tickets-1989153616012\n\nThe Team at DocWriteReview\n\n202-800-1899",
    "campaign": "CAMPAIGN 6: SEMINAR PROMOTION — HOLD ON, DON'T PANIC"
  },
  {
    "name": "CAMPAIGN 6: Reminder: 9 Days Out",
    "category": "GENERAL_BUSINESS",
    "subject": "9 days until the seminar. Here is why your clients need to be there.",
    "htmlContent": "<p>Hi {{FIRSTNAME}},</p>\n<p>Quick reminder that 'Hold On. Don't Panic.' is happening on August 29.</p>\n<p>If you serve individuals dealing with debt, bankruptcy, job loss, or financial hardship, this is 90 minutes of content you can share with every client walking through your door. The seminar covers what to do (and what not to do) in the first 72 hours of a financial crisis, in plain language, with real legal frameworks they can act on immediately.</p>\n<p>It is also useful for your staff. Anyone providing financial counseling, legal aid, or crisis support will walk away with a clearer framework for the guidance they already give.</p>\n<p>$24.95 includes the Financial Crisis Survival Guide.</p>\n<p>Register: <a href=\"https://www.eventbrite.com/e/hold-on-dont-panic-you-have-the-power-to-advocate-for-yourself-tickets-1989153616012\">https://www.eventbrite.com/e/hold-on-dont-panic-you-have-the-power-to-advocate-for-yourself-tickets-1989153616012</a></p>\n<p>The Team at DocWriteReview</p>",
    "plainText": "Hi {{FIRSTNAME}},\n\nQuick reminder that 'Hold On. Don't Panic.' is happening on August 29.\n\nIf you serve individuals dealing with debt, bankruptcy, job loss, or financial hardship, this is 90 minutes of content you can share with every client walking through your door. The seminar covers what to do (and what not to do) in the first 72 hours of a financial crisis, in plain language, with real legal frameworks they can act on immediately.\n\nIt is also useful for your staff. Anyone providing financial counseling, legal aid, or crisis support will walk away with a clearer framework for the guidance they already give.\n\n$24.95 includes the Financial Crisis Survival Guide.\n\nRegister: https://www.eventbrite.com/e/hold-on-dont-panic-you-have-the-power-to-advocate-for-yourself-tickets-1989153616012\n\nThe Team at DocWriteReview",
    "campaign": "CAMPAIGN 6: SEMINAR PROMOTION — HOLD ON, DON'T PANIC"
  },
  {
    "name": "CAMPAIGN 6: Final Reminder: 2 Days Out",
    "category": "GENERAL_BUSINESS",
    "subject": "This Saturday: Hold On. Don't Panic. Last chance to register.",
    "htmlContent": "<p>Hi {{FIRSTNAME}},</p>\n<p>'Hold On. Don't Panic.' is this Saturday, August 29, at 10:00 AM Pacific.</p>\n<p>90 minutes. The financial survival roadmap that tells you exactly what to do, in what order, and why. Led by an author and advocate who has been on both sides of the system.</p>\n<p>If you or someone you know is facing a financial crisis right now, this is the most useful $24.95 they will spend this month.</p>\n<p>Register: <a href=\"https://www.eventbrite.com/e/hold-on-dont-panic-you-have-the-power-to-advocate-for-yourself-tickets-1989153616012\">https://www.eventbrite.com/e/hold-on-dont-panic-you-have-the-power-to-advocate-for-yourself-tickets-1989153616012</a></p>\n<p>See you Saturday.</p>\n<p>The Team at DocWriteReview</p>\n<p>202-800-1899</p>",
    "plainText": "Hi {{FIRSTNAME}},\n\n'Hold On. Don't Panic.' is this Saturday, August 29, at 10:00 AM Pacific.\n\n90 minutes. The financial survival roadmap that tells you exactly what to do, in what order, and why. Led by an author and advocate who has been on both sides of the system.\n\nIf you or someone you know is facing a financial crisis right now, this is the most useful $24.95 they will spend this month.\n\nRegister: https://www.eventbrite.com/e/hold-on-dont-panic-you-have-the-power-to-advocate-for-yourself-tickets-1989153616012\n\nSee you Saturday.\n\nThe Team at DocWriteReview\n\n202-800-1899",
    "campaign": "CAMPAIGN 6: SEMINAR PROMOTION — HOLD ON, DON'T PANIC"
  }
];

async function main() {
  // Find the admin user (prefer Info@DocWriteReview.com, then any admin, then any user)
  let adminUser = await prisma.user.findUnique({
    where: { email: "info@docwritereview.com" },
  });
  
  if (!adminUser) {
    adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });
  }
  if (!adminUser) {
    adminUser = await prisma.user.findFirst();
  }
  
  if (!adminUser) {
    console.error("No user found in the database. Create a user first.");
    process.exit(1);
  }
  
  console.log(`Importing ${TEMPLATES.length} drip campaign templates for: ${adminUser.email}`);
  console.log("");
  
  let created = 0;
  let skipped = 0;
  
  for (const t of TEMPLATES) {
    const existing = await prisma.emailTemplate.findFirst({
      where: { userId: adminUser.id, name: t.name },
    });
    
    if (existing) {
      console.log(`  SKIP: ${t.name} (already exists)`);
      skipped++;
      continue;
    }
    
    await prisma.emailTemplate.create({
      data: {
        userId: adminUser.id,
        name: t.name,
        category: t.category,
        subject: t.subject,
        htmlContent: t.htmlContent,
        plainText: t.plainText,
        isSample: false,
      },
    });
    
    console.log(`  ✓ Created: ${t.name}`);
    created++;
  }
  
  console.log("");
  console.log(`Done. Created ${created} templates, skipped ${skipped} (already existed).`);
  console.log("Visit https://dwremail.online/dashboard/templates to see them.");
}

main()
  .catch((e) => {
    console.error("Import failed:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
