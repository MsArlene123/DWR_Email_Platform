import { prisma } from '@/lib/prisma';
import { TemplateCategory } from '@prisma/client';

const sampleTemplates = [
  // Nonprofit Templates
  {
    name: 'Donation Request - Annual Fund',
    category: TemplateCategory.NONPROFIT,
    subject: 'Make a Difference Today - Support {{COMPANY_NAME}}',
    htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h2 style="color: #2563eb;">Dear {{FIRST_NAME}},</h2>
<p>I hope this message finds you well. As we reflect on another impactful year at {{COMPANY_NAME}}, I'm reaching out to share our accomplishments and invite you to be part of our mission.</p>
<p><strong>This year, we've achieved:</strong></p>
<ul>
<li>Served over 5,000 community members</li>
<li>Launched three new programs addressing critical needs</li>
<li>Partnered with 25 local organizations</li>
</ul>
<p>Your support makes this work possible. A donation of any amount helps us continue serving those who need it most.</p>
<div style="text-align: center; margin: 30px 0;">
<a href="#" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Donate Now</a>
</div>
<p>Thank you for believing in our mission.</p>
<p>Warmly,<br>The {{COMPANY_NAME}} Team</p>
</div>`,
    plainText: 'Dear {{FIRST_NAME}},\n\nI hope this message finds you well...',
  },
  {
    name: 'Event Invitation - Fundraising Gala',
    category: TemplateCategory.NONPROFIT,
    subject: "You're Invited: {{COMPANY_NAME}} Annual Gala",
    htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(to bottom, #f0f9ff, #ffffff); padding: 20px;">
<h1 style="color: #1e40af; text-align: center;">You're Invited!</h1>
<p>Dear {{FIRST_NAME}} {{LAST_NAME}},</p>
<p>Join us for an evening of celebration, connection, and community impact at our Annual Fundraising Gala.</p>
<div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #2563eb;">
<p><strong>📅 Date:</strong> Saturday, June 15th, 2026</p>
<p><strong>🕒 Time:</strong> 6:00 PM - 10:00 PM</p>
<p><strong>📍 Location:</strong> The Grand Ballroom</p>
<p><strong>👔 Dress Code:</strong> Cocktail Attire</p>
</div>
<p>The evening will feature:</p>
<ul>
<li>Live music and entertainment</li>
<li>Gourmet dinner</li>
<li>Silent auction with exclusive items</li>
<li>Inspiring stories from our community</li>
</ul>
<div style="text-align: center; margin: 30px 0;">
<a href="#" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">RSVP Now</a>
</div>
<p>We can't wait to see you there!</p>
</div>`,
    plainText: "You're invited to our Annual Fundraising Gala...",
  },
  {
    name: 'Volunteer Recruitment',
    category: TemplateCategory.NONPROFIT,
    subject: 'Join Our Team - Volunteer Opportunities at {{COMPANY_NAME}}',
    htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h2 style="color: #10b981;">Hi {{FIRST_NAME}},</h2>
<p>Are you passionate about making a difference in your community? {{COMPANY_NAME}} is looking for dedicated volunteers like you!</p>
<div style="background: #f0fdf4; padding: 20px; border-radius: 10px; margin: 20px 0;">
<h3 style="color: #059669;">Why Volunteer With Us?</h3>
<ul>
<li>Make a tangible impact in your community</li>
<li>Develop new skills and experiences</li>
<li>Connect with like-minded individuals</li>
<li>Flexible scheduling to fit your lifestyle</li>
</ul>
</div>
<p><strong>Current Opportunities:</strong></p>
<ul>
<li>Event Coordinator (10 hours/month)</li>
<li>Mentor for Youth Programs (flexible schedule)</li>
<li>Community Outreach Ambassador (remote option available)</li>
</ul>
<div style="text-align: center; margin: 30px 0;">
<a href="#" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Apply to Volunteer</a>
</div>
<p>Together, we can create positive change!</p>
</div>`,
    plainText: 'Hi {{FIRST_NAME}},\n\nAre you passionate about making a difference...',
  },
  {
    name: 'Partnership Proposal',
    category: TemplateCategory.NONPROFIT,
    subject: 'Partnership Opportunity with {{COMPANY_NAME}}',
    htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<p>Dear {{FIRST_NAME}},</p>
<p>I'm reaching out on behalf of {{COMPANY_NAME}}. We've been following your work and believe there's a powerful opportunity for collaboration.</p>
<h3 style="color: #2563eb;">Partnership Benefits:</h3>
<ul>
<li><strong>Community Impact:</strong> Together, we can serve more people in need</li>
<li><strong>Shared Resources:</strong> Leverage our networks and expertise</li>
<li><strong>Brand Visibility:</strong> Co-marketing opportunities</li>
<li><strong>Tax Benefits:</strong> Corporate social responsibility initiatives</li>
</ul>
<p>I'd love to schedule a brief call to discuss how we might work together.</p>
<div style="text-align: center; margin: 30px 0;">
<a href="#" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Schedule a Call</a>
</div>
<p>Best regards,<br>{{YOUR_NAME}}<br>{{COMPANY_NAME}}</p>
</div>`,
    plainText: 'Dear {{FIRST_NAME}},\n\nPartnership opportunity...',
  },
  {
    name: 'Monthly Newsletter',
    category: TemplateCategory.NONPROFIT,
    subject: '{{COMPANY_NAME}} Monthly Update',
    htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<div style="background: #2563eb; color: white; padding: 20px; text-align: center;">
<h1>Monthly Impact Report</h1>
<p>{{COMPANY_NAME}}</p>
</div>
<div style="padding: 20px;">
<p>Hi {{FIRST_NAME}},</p>
<p>Thank you for being part of our community! Here's what we accomplished together this month:</p>
<div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
<h3 style="color: #1e40af; margin-top: 0;">📊 Monthly Highlights</h3>
<ul>
<li>250 meals served to families in need</li>
<li>15 new volunteers joined our team</li>
<li>$12,000 raised for summer programs</li>
<li>Launched our new mentorship initiative</li>
</ul>
</div>
<h3>Upcoming Events</h3>
<ul>
<li><strong>Community Clean-Up Day</strong></li>
<li><strong>Virtual Town Hall</strong></li>
<li><strong>Volunteer Appreciation Dinner</strong></li>
</ul>
<div style="text-align: center; margin: 30px 0;">
<a href="#" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 0 5px;">Visit Our Website</a>
<a href="#" style="background-color: #1e40af; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 0 5px;">Donate</a>
</div>
</div>
</div>`,
    plainText: 'Hi {{FIRST_NAME}},\n\nHere is our monthly update...',
  },

  // Attorney/Legal Templates
  {
    name: 'Legal Service Introduction',
    category: TemplateCategory.ATTORNEY_LEGAL,
    subject: 'Expert Legal Representation - {{YOUR_FIRM_NAME}}',
    htmlContent: `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
<div style="background: #1e40af; color: white; padding: 30px; text-align: center;">
<h1 style="margin: 0;">{{YOUR_FIRM_NAME}}</h1>
<p style="margin: 5px 0 0 0;">Attorneys at Law</p>
</div>
<div style="padding: 30px;">
<p>Dear {{FIRST_NAME}} {{LAST_NAME}},</p>
<p>I hope this message finds you well. I'm reaching out to introduce our firm and the legal services we offer.</p>
<p>With extensive experience, we've successfully represented clients in:</p>
<ul style="line-height: 1.8;">
<li>Business &amp; Corporate Law</li>
<li>Contract Negotiations</li>
<li>Litigation &amp; Dispute Resolution</li>
<li>Intellectual Property</li>
<li>Estate Planning</li>
</ul>
<div style="background: #f9fafb; border-left: 4px solid #1e40af; padding: 20px; margin: 25px 0;">
<p style="margin: 0;"><em>"The best legal outcomes come from proactive strategy, not reactive responses."</em></p>
</div>
<p>I'd be happy to offer a complimentary 30-minute consultation to discuss your legal needs.</p>
<div style="text-align: center; margin: 30px 0;">
<a href="#" style="background-color: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 3px; display: inline-block;">Schedule Consultation</a>
</div>
<p>Best regards,<br>{{YOUR_FIRM_NAME}}<br>{{PHONE_NUMBERS}}</p>
</div>
</div>`,
    plainText: 'Dear {{FIRST_NAME}} {{LAST_NAME}},\n\nIntroducing our legal services...',
  },
  {
    name: 'Case Study - Success Story',
    category: TemplateCategory.ATTORNEY_LEGAL,
    subject: 'How We Helped Win a Complex Case',
    htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h2 style="color: #1e40af;">Case Study: Successful Business Litigation</h2>
<p>Dear {{FIRST_NAME}},</p>
<p>I wanted to share a recent success story that demonstrates our commitment to achieving outstanding results.</p>
<div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
<h3 style="color: #1e40af; margin-top: 0;">The Challenge</h3>
<p>A mid-sized company faced a breach of contract lawsuit threatening their operations. The opposing party sought $2.5 million in damages.</p>
</div>
<div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
<h3 style="color: #059669; margin-top: 0;">Our Approach</h3>
<ul>
<li>Comprehensive contract analysis</li>
<li>Strategic motion practice</li>
<li>Expert witness coordination</li>
<li>Aggressive yet professional negotiation</li>
</ul>
</div>
<div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
<h3 style="color: #d97706; margin-top: 0;">The Outcome</h3>
<p><strong>Case dismissed with prejudice.</strong> Our client paid zero dollars and was awarded attorney fees.</p>
</div>
<div style="text-align: center; margin: 30px 0;">
<a href="#" style="background-color: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 3px; display: inline-block;">Request a Consultation</a>
</div>
</div>`,
    plainText: 'Dear {{FIRST_NAME}},\n\nA recent success story...',
  },
  {
    name: 'Consultation Offer',
    category: TemplateCategory.ATTORNEY_LEGAL,
    subject: 'Complimentary Legal Consultation - {{COMPANY_NAME}}',
    htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<p>Dear {{FIRST_NAME}},</p>
<p>Legal issues can be complex and overwhelming. That's why I'm offering a <strong>complimentary 30-minute consultation</strong> to discuss your legal concerns—no strings attached.</p>
<div style="background: #1e40af; color: white; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
<h2 style="margin: 0 0 10px 0;">Free 30-Minute Consultation</h2>
<p style="margin: 0; font-size: 18px;">Valued at $250</p>
</div>
<h3>During our consultation, we'll discuss:</h3>
<ul style="line-height: 1.8;">
<li>Your specific legal situation</li>
<li>Available options and strategies</li>
<li>Potential outcomes and timelines</li>
<li>Cost estimates for representation</li>
</ul>
<p>There's no obligation—just honest, professional advice.</p>
<div style="text-align: center; margin: 30px 0;">
<a href="#" style="background-color: #dc2626; color: white; padding: 14px 35px; text-decoration: none; border-radius: 3px; display: inline-block; font-weight: bold;">Claim Your Free Consultation</a>
</div>
<p style="font-size: 14px; color: #6b7280;">Available consultation times are limited. Schedule today.</p>
</div>`,
    plainText: 'Dear {{FIRST_NAME}},\n\nFree 30-minute legal consultation...',
  },
  {
    name: 'Legal Update Newsletter',
    category: TemplateCategory.ATTORNEY_LEGAL,
    subject: 'Important Legal Updates',
    htmlContent: `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
<div style="background: #1f2937; color: white; padding: 25px;">
<h1 style="margin: 0;">Legal Insights</h1>
<p style="margin: 5px 0 0 0; opacity: 0.9;">Monthly Newsletter</p>
</div>
<div style="padding: 30px;">
<p>Dear {{FIRST_NAME}},</p>
<p>Welcome to our monthly legal update, keeping you informed about important changes that may affect you or your business.</p>
<div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 20px;">
<h3 style="color: #1e40af;">New Employment Law Changes</h3>
<p>New regulations regarding employee classification go into effect soon. This may impact how you classify contractors vs. employees.</p>
</div>
<div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 20px;">
<h3 style="color: #1e40af;">Privacy Law Updates</h3>
<p>Recent court decisions have clarified requirements for data breach notifications. Ensure your business is compliant.</p>
</div>
<p>Have questions? Contact us for a consultation.</p>
<p>Best regards,<br>The {{COMPANY_NAME}} Team</p>
</div>
</div>`,
    plainText: 'Dear {{FIRST_NAME}},\n\nMonthly legal updates...',
  },
  {
    name: 'Referral Request',
    category: TemplateCategory.ATTORNEY_LEGAL,
    subject: 'Thank You + A Small Favor',
    htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<p>Dear {{FIRST_NAME}},</p>
<p>I hope you're doing well! I wanted to reach out personally to thank you for your trust in our firm.</p>
<div style="background: #f0f9ff; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #2563eb;">
<p style="margin: 0; font-size: 16px;"><strong>If you know anyone who could benefit from our legal services, would you consider introducing us?</strong></p>
</div>
<p>As a token of our appreciation, we offer:</p>
<ul>
<li>$100 gift card for each referral who becomes a client</li>
<li>Priority scheduling for your referred contacts</li>
<li>Complimentary 30-minute consultation for your referrals</li>
</ul>
<div style="text-align: center; margin: 30px 0;">
<a href="#" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 3px; display: inline-block;">Refer a Friend</a>
</div>
<p>Thank you again for your support!<br>[Your Name], Esq.<br>{{COMPANY_NAME}}</p>
</div>`,
    plainText: 'Dear {{FIRST_NAME}},\n\nThank you for your trust in our firm...',
  },

  // Bookstore/Media Templates
  {
    name: 'Book Promotion - New Release',
    category: TemplateCategory.BOOKSTORE_MEDIA,
    subject: 'New Release: [Book Title] Now Available',
    htmlContent: `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center;">
<h1 style="margin: 0; font-size: 32px;">New Release</h1>
<p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">[Book Title]</p>
</div>
<div style="padding: 30px;">
<p>Dear {{FIRST_NAME}},</p>
<p>I'm thrilled to announce the release of my latest book, <strong>[Book Title]</strong>, now available at your bookstore and online retailers!</p>
<div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0;">
<h3 style="color: #667eea; margin-top: 0;">About the Book</h3>
<p>[Insert compelling book description here. Mention key themes and who it's perfect for.]</p>
</div>
<h3>Why Stock This Book?</h3>
<ul style="line-height: 1.8;">
<li>Growing author platform</li>
<li>Positive early reviews</li>
<li>Perfect for [target audience]</li>
<li>Marketing support including author appearances</li>
</ul>
<div style="text-align: center; margin: 30px 0;">
<a href="#" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Order Copies</a>
</div>
</div>
</div>`,
    plainText: 'Dear {{FIRST_NAME}},\n\nNew book release announcement...',
  },
  {
    name: 'Media Kit - Review Request',
    category: TemplateCategory.BOOKSTORE_MEDIA,
    subject: 'Review Request: [Book Title] + Media Kit',
    htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<p>Dear {{FIRST_NAME}},</p>
<p>I'm an author specializing in [genre/topic]. I believe my latest book, <strong>[Book Title]</strong>, would resonate with your readers at {{COMPANY_NAME}}.</p>
<div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
<h3 style="color: #92400e; margin-top: 0;">📚 Quick Book Overview</h3>
<p><strong>Title:</strong> [Book Title]</p>
<p><strong>Genre:</strong> [Genre]</p>
<p><strong>Key Themes:</strong> [List 2-3 main themes]</p>
</div>
<h3>Media Kit Includes:</h3>
<ul>
<li>High-resolution author photo</li>
<li>Book cover images (multiple formats)</li>
<li>Author biography &amp; book synopsis</li>
<li>Sample chapters &amp; interview questions</li>
</ul>
<div style="text-align: center; margin: 30px 0;">
<a href="#" style="background-color: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Download Media Kit</a>
<a href="#" style="background-color: #6b7280; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin-left: 10px;">Request Review Copy</a>
</div>
</div>`,
    plainText: 'Dear {{FIRST_NAME}},\n\nReview request for [Book Title]...',
  },
  {
    name: 'Author Event Invitation',
    category: TemplateCategory.BOOKSTORE_MEDIA,
    subject: 'Book Signing Event at {{COMPANY_NAME}}',
    htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<div style="background: linear-gradient(to right, #ec4899, #8b5cf6); color: white; padding: 40px; text-align: center;">
<h1 style="margin: 0; font-size: 36px;">Author Event!</h1>
<p style="margin: 10px 0 0 0; font-size: 20px;">Meet the Author</p>
</div>
<div style="padding: 30px;">
<p>Dear {{FIRST_NAME}},</p>
<p>You're invited to an exclusive book signing and reading event!</p>
<div style="background: #fef2f2; padding: 25px; border-radius: 8px; margin: 25px 0; border: 2px solid #f87171;">
<h3 style="color: #991b1b; margin-top: 0; text-align: center;">📅 Event Details</h3>
<p style="text-align: center;"><strong>Date:</strong> [Event Date]</p>
<p style="text-align: center;"><strong>Time:</strong> [Start] - [End]</p>
<p style="text-align: center;"><strong>Location:</strong> {{COMPANY_NAME}}</p>
</div>
<h3>Event Highlights:</h3>
<ul style="line-height: 1.8;">
<li>📖 Reading from [Book Title]</li>
<li>✍️ Book signing and personalization</li>
<li>💬 Q&amp;A session with the author</li>
<li>☕ Refreshments provided</li>
<li>🎁 Special giveaways for attendees</li>
</ul>
<div style="text-align: center; margin: 30px 0;">
<a href="#" style="background-color: #8b5cf6; color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">RSVP Now</a>
</div>
<p style="font-size: 14px; color: #6b7280; text-align: center;">Seating is limited. Please RSVP early.</p>
</div>
</div>`,
    plainText: "You're invited to an exclusive book signing event...",
  },
  {
    name: 'Music Release Announcement',
    category: TemplateCategory.BOOKSTORE_MEDIA,
    subject: '🎵 New Music Release - [Song/Album Title]',
    htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 40px; text-align: center;">
<h1 style="margin: 0; font-size: 42px;">🎵</h1>
<h2 style="margin: 10px 0;">New Release</h2>
<h1 style="margin: 10px 0; font-size: 32px;">[Song/Album Title]</h1>
</div>
<div style="padding: 30px;">
<p>Dear {{FIRST_NAME}},</p>
<p>I'm excited to share my latest musical creation! <strong>[Song/Album Title]</strong> is now available on all major streaming platforms.</p>
<h3>🎧 Listen Now On:</h3>
<div style="text-align: center; margin: 25px 0;">
<a href="#" style="display: inline-block; background-color: #1DB954; color: white; padding: 10px 25px; text-decoration: none; border-radius: 25px; margin: 5px;">Spotify</a>
<a href="#" style="display: inline-block; background-color: #FA243C; color: white; padding: 10px 25px; text-decoration: none; border-radius: 25px; margin: 5px;">Apple Music</a>
<a href="#" style="display: inline-block; background-color: #FF0000; color: white; padding: 10px 25px; text-decoration: none; border-radius: 25px; margin: 5px;">YouTube</a>
</div>
<p>Your support means the world and helps me continue creating music that matters.</p>
<div style="text-align: center; margin: 30px 0;">
<a href="#" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Listen Now</a>
</div>
</div>
</div>`,
    plainText: 'New music release now on all streaming platforms...',
  },
  {
    name: 'Collaboration Proposal - Media Outlets',
    category: TemplateCategory.BOOKSTORE_MEDIA,
    subject: 'Collaboration Opportunity',
    htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<p>Dear {{FIRST_NAME}},</p>
<p>I've been following {{COMPANY_NAME}}'s work and I'm impressed by your commitment to quality content. I believe there's a valuable opportunity for us to collaborate.</p>
<div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 25px 0;">
<h3 style="color: #1e40af; margin-top: 0;">Collaboration Ideas:</h3>
<ul>
<li><strong>Guest Articles/Blog Posts</strong></li>
<li><strong>Interview Features</strong></li>
<li><strong>Audio Content</strong> for podcasts or video</li>
<li><strong>Author Spotlights</strong></li>
<li><strong>Social Media Takeovers</strong></li>
</ul>
</div>
<h3>What I Bring:</h3>
<ul style="line-height: 1.8;">
<li>Years of experience in content creation</li>
<li>Engaged audience across platforms</li>
<li>Published works and professional portfolio</li>
</ul>
<div style="text-align: center; margin: 30px 0;">
<a href="#" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Schedule a Call</a>
</div>
<p>Thank you for considering this opportunity!</p>
</div>`,
    plainText: 'Dear {{FIRST_NAME}},\n\nCollaboration opportunity...',
  },

  // General Business Templates
  {
    name: 'Professional Introduction',
    category: TemplateCategory.GENERAL_BUSINESS,
    subject: 'Introduction - Potential Partnership Opportunity',
    htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<p>Dear {{FIRST_NAME}},</p>
<p>I hope this email finds you well. I'm reaching out because I believe there may be a mutually beneficial opportunity for our organizations to work together.</p>
<p>I've been following {{COMPANY_NAME}}'s work and I'm impressed by your approach.</p>
<div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #10b981;">
<h3 style="color: #065f46; margin-top: 0;">About Us</h3>
<p>We specialize in [brief description]. Our clients have experienced [specific results].</p>
</div>
<h3>How We Might Work Together:</h3>
<ul style="line-height: 1.8;">
<li>[Collaboration idea #1]</li>
<li>[Collaboration idea #2]</li>
<li>[Collaboration idea #3]</li>
</ul>
<div style="text-align: center; margin: 30px 0;">
<a href="#" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Schedule a Call</a>
</div>
<p>Best regards,<br>[Your Name]<br>{{PHONE_NUMBERS}}</p>
</div>`,
    plainText: 'Dear {{FIRST_NAME}},\n\nPotential partnership opportunity...',
  },
  {
    name: 'Follow-Up Email',
    category: TemplateCategory.GENERAL_BUSINESS,
    subject: 'Following Up - [Previous Topic]',
    htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<p>Hi {{FIRST_NAME}},</p>
<p>I wanted to follow up on my previous email regarding [topic/opportunity]. I understand you're busy, so I'll keep this brief.</p>
<div style="background: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
<p style="margin: 0;"><strong>Quick Recap:</strong> [One sentence summary of your previous email]</p>
</div>
<p>I believe this could be valuable for {{COMPANY_NAME}} because:</p>
<ul>
<li>[Key benefit #1]</li>
<li>[Key benefit #2]</li>
<li>[Key benefit #3]</li>
</ul>
<p>If now isn't the right time, I completely understand. If you'd like to explore this further, I'm happy to work around your schedule.</p>
<p>Thanks again,<br>[Your Name]</p>
</div>`,
    plainText: 'Hi {{FIRST_NAME}},\n\nFollowing up on my previous email...',
  },
  {
    name: 'Product/Service Announcement',
    category: TemplateCategory.GENERAL_BUSINESS,
    subject: 'Introducing [Product/Service Name]',
    htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center;">
<h1 style="margin: 0;">Introducing</h1>
<h2 style="margin: 10px 0; font-size: 36px;">[Product/Service Name]</h2>
</div>
<div style="padding: 30px;">
<p>Hi {{FIRST_NAME}},</p>
<p>I'm excited to introduce [Product/Service Name], designed to help [target audience] achieve [specific outcome].</p>
<div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 25px 0;">
<h3 style="color: #1e40af; margin-top: 0;">Why [Product/Service Name]?</h3>
<p>[Explain the problem it solves and why it's different]</p>
</div>
<h3>Key Features:</h3>
<ul>
<li>✓ [Feature 1]</li>
<li>✓ [Feature 2]</li>
<li>✓ [Feature 3]</li>
<li>✓ [Feature 4]</li>
</ul>
<div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
<h3 style="color: #166534; margin-top: 0;">🎁 Limited Time Offer</h3>
<p style="margin: 0; font-size: 18px;"><strong>[Discount/Special Offer Details]</strong></p>
</div>
<div style="text-align: center; margin: 30px 0;">
<a href="#" style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Learn More</a>
</div>
</div>
</div>`,
    plainText: 'Hi {{FIRST_NAME}},\n\nIntroducing [Product/Service Name]...',
  },
  {
    name: 'Thank You Note',
    category: TemplateCategory.GENERAL_BUSINESS,
    subject: 'Thank You, {{FIRST_NAME}}!',
    htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<div style="background: #f0fdf4; padding: 30px; text-align: center; border-bottom: 3px solid #10b981;">
<h1 style="color: #065f46; margin: 0;">Thank You!</h1>
</div>
<div style="padding: 30px;">
<p>Dear {{FIRST_NAME}},</p>
<p>I wanted to take a moment to personally thank you for [specific action]. Your support means more than you know.</p>
<div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3b82f6;">
<p style="margin: 0; font-style: italic;">"[A meaningful quote or personal message]"</p>
</div>
<p>As a small token of appreciation, I'd like to offer:</p>
<ul>
<li>[Special offer or benefit #1]</li>
<li>[Special offer or benefit #2]</li>
</ul>
<div style="text-align: center; margin: 30px 0;">
<a href="#" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Claim Your Thank You Gift</a>
</div>
<p>Thank you again!</p>
</div>
</div>`,
    plainText: 'Dear {{FIRST_NAME}},\n\nThank you for your support...',
  },
  {
    name: 'Quarterly Newsletter',
    category: TemplateCategory.GENERAL_BUSINESS,
    subject: 'Quarterly Update from [Company Name]',
    htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<div style="background: #111827; color: white; padding: 30px; text-align: center;">
<h1 style="margin: 0;">Quarterly Newsletter</h1>
<p style="margin: 10px 0 0 0; opacity: 0.8;">Your quarterly update from [Company Name]</p>
</div>
<div style="padding: 30px;">
<p>Hi {{FIRST_NAME}},</p>
<p>Welcome to our quarterly newsletter! Here's what's been happening:</p>
<div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 20px;">
<h3 style="color: #3b82f6;">🚀 Company News</h3>
<p>[Share exciting company updates, milestones, or announcements]</p>
</div>
<div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 20px;">
<h3 style="color: #3b82f6;">📈 Industry Insights</h3>
<p>[Share relevant industry trends, tips, or thought leadership content]</p>
</div>
<div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 20px;">
<h3 style="color: #3b82f6;">🎯 What's Coming Next</h3>
<p>[Preview upcoming products, events, or initiatives]</p>
</div>
<div style="text-align: center; margin: 30px 0;">
<a href="#" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Visit Our Website</a>
</div>
<p style="margin: 10px 0 0 0; text-align: center; font-size: 14px; color: #6b7280;"><a href="#" style="color: #6b7280;">Update Preferences</a> | <a href="#" style="color: #6b7280;">Unsubscribe</a></p>
</div>
</div>`,
    plainText: 'Hi {{FIRST_NAME}},\n\nWelcome to our quarterly newsletter...',
  },
];

/**
 * Seeds sample templates for a user if they don't have any yet.
 * Called automatically when a user visits the templates page.
 * Returns the number of templates created.
 */
export async function seedSampleTemplatesForUser(userId: string): Promise<number> {
  // Check if user already has templates
  const existingCount = await prisma.emailTemplate.count({ where: { userId } });
  if (existingCount > 0) return 0;

  // Create all sample templates for this user
  const created = await prisma.emailTemplate.createMany({
    data: sampleTemplates.map((t) => ({
      userId,
      name: t.name,
      category: t.category,
      subject: t.subject,
      htmlContent: t.htmlContent,
      plainText: t.plainText || null,
      isSample: true,
    })),
  });

  return created.count;
}
