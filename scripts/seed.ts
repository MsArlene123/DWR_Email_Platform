import { PrismaClient, TemplateCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const sampleTemplates = [
  // Nonprofit Templates
  {
    name: 'Donation Request - Annual Fund',
    category: TemplateCategory.NONPROFIT,
    subject: 'Make a Difference Today - Support {{COMPANY_NAME}}',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
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
        
        <p>Warmly,<br>
        The {{COMPANY_NAME}} Team</p>
      </div>
    `,
    plainText: 'Dear {{FIRST_NAME}},\n\nI hope this message finds you well...',
    isSample: true,
  },
  {
    name: 'Event Invitation - Fundraising Gala',
    category: TemplateCategory.NONPROFIT,
    subject: "You're Invited: {{COMPANY_NAME}} Annual Gala",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(to bottom, #f0f9ff, #ffffff); padding: 20px;">
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
      </div>
    `,
    plainText: "You're invited to our Annual Fundraising Gala...",
    isSample: true,
  },
  {
    name: 'Volunteer Recruitment',
    category: TemplateCategory.NONPROFIT,
    subject: 'Join Our Team - Volunteer Opportunities at {{COMPANY_NAME}}',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
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
        
        <p>Questions? Reply to this email or call us at {{PHONE_NUMBERS}}.</p>
        
        <p>Together, we can create positive change!</p>
      </div>
    `,
    plainText: 'Hi {{FIRST_NAME}},\n\nAre you passionate about making a difference...',
    isSample: true,
  },
  {
    name: 'Partnership Proposal',
    category: TemplateCategory.NONPROFIT,
    subject: 'Partnership Opportunity with {{COMPANY_NAME}}',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Dear {{FIRST_NAME}},</p>
        
        <p>I'm reaching out on behalf of {{COMPANY_NAME}}, a nonprofit organization dedicated to [mission]. We've been following {{TITLE}} at {{COMPANY_NAME}}'s work and believe there's a powerful opportunity for collaboration.</p>
        
        <h3 style="color: #2563eb;">Partnership Benefits:</h3>
        <ul>
          <li><strong>Community Impact:</strong> Together, we can serve more people in need</li>
          <li><strong>Shared Resources:</strong> Leverage our networks and expertise</li>
          <li><strong>Brand Visibility:</strong> Co-marketing opportunities</li>
          <li><strong>Tax Benefits:</strong> Corporate social responsibility initiatives</li>
        </ul>
        
        <p>I'd love to schedule a brief call to discuss how we might work together to create meaningful change in our community.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Schedule a Call</a>
        </div>
        
        <p>Looking forward to exploring this opportunity together.</p>
        
        <p>Best regards,<br>
        {{YOUR_NAME}}<br>
        {{COMPANY_NAME}}</p>
      </div>
    `,
    plainText: 'Dear {{FIRST_NAME}},\n\nI\'m reaching out on behalf of...',
    isSample: true,
  },
  {
    name: 'Monthly Newsletter',
    category: TemplateCategory.NONPROFIT,
    subject: '{{COMPANY_NAME}} Monthly Update - April 2026',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563eb; color: white; padding: 20px; text-align: center;">
          <h1>Monthly Impact Report</h1>
          <p>{{COMPANY_NAME}}</p>
        </div>
        
        <div style="padding: 20px;">
          <p>Hi {{FIRST_NAME}},</p>
          
          <p>Thank you for being part of our community! Here's what we accomplished together this month:</p>
          
          <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">📊 April Highlights</h3>
            <ul>
              <li>250 meals served to families in need</li>
              <li>15 new volunteers joined our team</li>
              <li>$12,000 raised for summer programs</li>
              <li>Launched our new mentorship initiative</li>
            </ul>
          </div>
          
          <h3>Upcoming Events</h3>
          <ul>
            <li><strong>May 5:</strong> Community Clean-Up Day</li>
            <li><strong>May 12:</strong> Virtual Town Hall</li>
            <li><strong>May 20:</strong> Volunteer Appreciation Dinner</li>
          </ul>
          
          <p>Stay connected and help us spread the word!</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 0 5px;">Visit Our Website</a>
            <a href="#" style="background-color: #1e40af; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 0 5px;">Donate</a>
          </div>
        </div>
      </div>
    `,
    plainText: 'Hi {{FIRST_NAME}},\n\nThank you for being part of our community...',
    isSample: true,
  },

  // Attorney/Legal Templates
  {
    name: 'Legal Service Introduction',
    category: TemplateCategory.ATTORNEY_LEGAL,
    subject: 'Expert Legal Representation - {{YOUR_FIRM_NAME}}',
    htmlContent: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
        <div style="background: #1e40af; color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0;">{{YOUR_FIRM_NAME}}</h1>
          <p style="margin: 5px 0 0 0;">Attorneys at Law</p>
        </div>
        
        <div style="padding: 30px;">
          <p>Dear {{FIRST_NAME}} {{LAST_NAME}},</p>
          
          <p>I hope this message finds you well. My name is [Your Name], and I'm a partner at {{YOUR_FIRM_NAME}}, specializing in [practice area].</p>
          
          <p>With over [X] years of experience, we've successfully represented clients in:</p>
          
          <ul style="line-height: 1.8;">
            <li>Business & Corporate Law</li>
            <li>Contract Negotiations</li>
            <li>Litigation & Dispute Resolution</li>
            <li>Intellectual Property</li>
            <li>Estate Planning</li>
          </ul>
          
          <div style="background: #f9fafb; border-left: 4px solid #1e40af; padding: 20px; margin: 25px 0;">
            <p style="margin: 0;"><em>"The best legal outcomes come from proactive strategy, not reactive responses."</em></p>
          </div>
          
          <p>I'd be happy to offer a complimentary 30-minute consultation to discuss your legal needs and how we can support your goals.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="background-color: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 3px; display: inline-block;">Schedule Consultation</a>
          </div>
          
          <p>Best regards,</p>
          <p><strong>[Your Name], Esq.</strong><br>
          {{YOUR_FIRM_NAME}}<br>
          {{PHONE_NUMBERS}}<br>
          {{WEBSITE}}</p>
        </div>
      </div>
    `,
    plainText: 'Dear {{FIRST_NAME}} {{LAST_NAME}},\n\nI hope this message finds you well...',
    isSample: true,
  },
  {
    name: 'Case Study - Success Story',
    category: TemplateCategory.ATTORNEY_LEGAL,
    subject: 'How We Helped [Client Type] Win [Case Type]',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Case Study: Successful Business Litigation</h2>
        
        <p>Dear {{FIRST_NAME}},</p>
        
        <p>I wanted to share a recent success story that demonstrates our commitment to achieving outstanding results for our clients.</p>
        
        <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1e40af; margin-top: 0;">The Challenge</h3>
          <p>A mid-sized technology company faced a breach of contract lawsuit that threatened their operations and reputation. The opposing party sought $2.5 million in damages.</p>
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
          <p><strong>Case dismissed with prejudice.</strong> Our client paid zero dollars and was awarded attorney fees. Their business operations continued without interruption.</p>
        </div>
        
        <p>If you're facing a similar legal challenge or want to ensure your business is protected, I'd be pleased to discuss how we can help.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background-color: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 3px; display: inline-block;">Request a Consultation</a>
        </div>
        
        <p>Sincerely,<br>
        [Your Name], Esq.</p>
      </div>
    `,
    plainText: 'Dear {{FIRST_NAME}},\n\nI wanted to share a recent success story...',
    isSample: true,
  },
  {
    name: 'Consultation Offer',
    category: TemplateCategory.ATTORNEY_LEGAL,
    subject: 'Complimentary Legal Consultation - {{COMPANY_NAME}}',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
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
        
        <p>There's no obligation to hire us—just honest, professional advice to help you make informed decisions.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background-color: #dc2626; color: white; padding: 14px 35px; text-decoration: none; border-radius: 3px; display: inline-block; font-weight: bold;">Claim Your Free Consultation</a>
        </div>
        
        <p style="font-size: 14px; color: #6b7280;">Available consultation times are limited. Schedule today to reserve your spot.</p>
        
        <p>Looking forward to speaking with you,</p>
        <p><strong>[Your Name], Esq.</strong><br>
        {{COMPANY_NAME}}<br>
        {{PHONE_NUMBERS}}</p>
      </div>
    `,
    plainText: 'Dear {{FIRST_NAME}},\n\nLegal issues can be complex and overwhelming...',
    isSample: true,
  },
  {
    name: 'Legal Update Newsletter',
    category: TemplateCategory.ATTORNEY_LEGAL,
    subject: 'Important Legal Updates - April 2026',
    htmlContent: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1f2937; color: white; padding: 25px;">
          <h1 style="margin: 0;">Legal Insights</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">April 2026 Newsletter</p>
        </div>
        
        <div style="padding: 30px;">
          <p>Dear {{FIRST_NAME}},</p>
          
          <p>Welcome to our monthly legal update, where we keep you informed about important changes in law and regulation that may affect you or your business.</p>
          
          <div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 20px;">
            <h3 style="color: #1e40af;">New Employment Law Changes</h3>
            <p>Starting May 1st, new regulations regarding employee classification go into effect. This may impact how you classify contractors vs. employees. <a href="#" style="color: #2563eb;">Read more →</a></p>
          </div>
          
          <div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 20px;">
            <h3 style="color: #1e40af;">Privacy Law Updates</h3>
            <p>Recent court decisions have clarified requirements for data breach notifications. Ensure your business is compliant. <a href="#" style="color: #2563eb;">Learn more →</a></p>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 5px; margin: 25px 0;">
            <h4 style="margin: 0 0 10px 0; color: #92400e;">📅 Upcoming Webinar</h4>
            <p style="margin: 0;"><strong>Contract Essentials for Business Owners</strong><br>
May 15, 2026 at 2:00 PM EST<br>
<a href="#" style="color: #d97706;">Register here</a></p>
          </div>
          
          <p>Have questions about these updates? <a href="#" style="color: #2563eb;">Contact us</a> for a consultation.</p>
          
          <p>Best regards,<br>
          The {{COMPANY_NAME}} Team</p>
        </div>
      </div>
    `,
    plainText: 'Dear {{FIRST_NAME}},\n\nWelcome to our monthly legal update...',
    isSample: true,
  },
  {
    name: 'Referral Request',
    category: TemplateCategory.ATTORNEY_LEGAL,
    subject: 'Thank You + A Small Favor',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Dear {{FIRST_NAME}},</p>
        
        <p>I hope you're doing well! I wanted to reach out personally to thank you for your trust in our firm. It's been a privilege to serve you.</p>
        
        <p>As a small practice that relies on word-of-mouth recommendations, I have a favor to ask:</p>
        
        <div style="background: #f0f9ff; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #2563eb;">
          <p style="margin: 0; font-size: 16px;"><strong>If you know anyone who could benefit from our legal services, would you consider introducing us?</strong></p>
        </div>
        
        <p>We specialize in helping clients with:</p>
        <ul>
          <li>Business formation and contracts</li>
          <li>Real estate transactions</li>
          <li>Estate planning and probate</li>
          <li>Civil litigation</li>
        </ul>
        
        <p>As a token of our appreciation, we offer:</p>
        <ul>
          <li>$100 Amazon gift card for each referral who becomes a client</li>
          <li>Priority scheduling for your referred contacts</li>
          <li>Complimentary 30-minute consultation for your referrals</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 3px; display: inline-block;">Refer a Friend</a>
        </div>
        
        <p>Thank you again for your trust and support!</p>
        
        <p>Warmly,<br>
        [Your Name], Esq.<br>
        {{COMPANY_NAME}}</p>
      </div>
    `,
    plainText: 'Dear {{FIRST_NAME}},\n\nI hope you\'re doing well...',
    isSample: true,
  },

  // Bookstore/Media Templates (Ms. Arlene)
  {
    name: 'Book Promotion - New Release',
    category: TemplateCategory.BOOKSTORE_MEDIA,
    subject: 'New Release: [Book Title] by Ms. Arlene',
    htmlContent: `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center;">
          <h1 style="margin: 0; font-size: 32px;">New Release from Ms. Arlene</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">[Book Title]</p>
        </div>
        
        <div style="padding: 30px;">
          <p>Dear {{FIRST_NAME}},</p>
          
          <p>I'm thrilled to announce the release of my latest book, <strong>[Book Title]</strong>, now available at your bookstore and online retailers!</p>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="color: #667eea; margin-top: 0;">About the Book</h3>
            <p>[Insert compelling book description here. Mention key themes, what makes it unique, and who it's perfect for.]</p>
            
            <p style="font-style: italic; color: #6b7280; margin: 20px 0;">
              "[Insert a powerful quote or review here]"<br>
              <span style="font-size: 14px;">— [Reviewer Name/Publication]</span>
            </p>
          </div>
          
          <div style="display: flex; gap: 20px; margin: 30px 0;">
            <div style="flex: 1; text-align: center;">
              <div style="background: #667eea; color: white; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                <p style="margin: 0; font-size: 24px; font-weight: bold;">⭐⭐⭐⭐⭐</p>
              </div>
              <p style="margin: 0; font-size: 14px; color: #6b7280;">5-Star Reviews</p>
            </div>
            <div style="flex: 1; text-align: center;">
              <div style="background: #764ba2; color: white; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                <p style="margin: 0; font-size: 24px; font-weight: bold;">[Pages]</p>
              </div>
              <p style="margin: 0; font-size: 14px; color: #6b7280;">Pages</p>
            </div>
          </div>
          
          <h3>Why Stock This Book?</h3>
          <ul style="line-height: 1.8;">
            <li>Growing author platform with [X] followers</li>
            <li>Positive early reviews from [publications]</li>
            <li>Perfect for [target audience]</li>
            <li>Marketing support including author appearances</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Order Copies</a>
          </div>
          
          <p>I'd love to discuss potential author events, signings, or other promotional opportunities. Please feel free to reach out!</p>
          
          <p>Warm regards,<br>
          <strong>Ms. Arlene</strong><br>
          Author<br>
          {{PHONE_NUMBERS}}<br>
          {{WEBSITE}}</p>
        </div>
      </div>
    `,
    plainText: 'Dear {{FIRST_NAME}},\n\nI\'m thrilled to announce the release of my latest book...',
    isSample: true,
  },
  {
    name: 'Media Kit - Review Request',
    category: TemplateCategory.BOOKSTORE_MEDIA,
    subject: 'Review Request: [Book Title] + Media Kit',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Dear {{FIRST_NAME}},</p>
        
        <p>My name is Ms. Arlene, and I'm an author specializing in [genre/topic]. I'm reaching out because I believe my latest book, <strong>[Book Title]</strong>, would resonate with your readers at {{COMPANY_NAME}}.</p>
        
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
          <h3 style="color: #92400e; margin-top: 0;">📚 Quick Book Overview</h3>
          <p><strong>Title:</strong> [Book Title]</p>
          <p><strong>Genre:</strong> [Genre]</p>
          <p><strong>Length:</strong> [Page count]</p>
          <p><strong>Release Date:</strong> [Date]</p>
          <p><strong>Key Themes:</strong> [List 2-3 main themes]</p>
        </div>
        
        <h3>What Makes This Book Special?</h3>
        <p>[Insert 2-3 paragraphs about what makes your book unique, timely, or relevant to their audience. Include any notable endorsements or early praise.]</p>
        
        <h3>Media Kit Includes:</h3>
        <ul>
          <li>High-resolution author photo</li>
          <li>Book cover images (multiple formats)</li>
          <li>Author biography</li>
          <li>Book synopsis (short & long versions)</li>
          <li>Sample chapters</li>
          <li>Interview questions</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background-color: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">Download Media Kit</a>
          <a href="#" style="background-color: #6b7280; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Request Review Copy</a>
        </div>
        
        <p>I'm happy to provide a complimentary review copy and am available for interviews, guest posts, or other collaborative content.</p>
        
        <p>Thank you for considering [Book Title] for review. I look forward to hearing from you!</p>
        
        <p>Best regards,<br>
        <strong>Ms. Arlene</strong><br>
        {{EMAIL_ADDRESS}}<br>
        {{WEBSITE}}</p>
      </div>
    `,
    plainText: 'Dear {{FIRST_NAME}},\n\nMy name is Ms. Arlene, and I\'m an author...',
    isSample: true,
  },
  {
    name: 'Author Event Invitation',
    category: TemplateCategory.BOOKSTORE_MEDIA,
    subject: 'Book Signing Event - Ms. Arlene at {{COMPANY_NAME}}',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: url('book-pattern.png'), linear-gradient(to right, #ec4899, #8b5cf6); color: white; padding: 40px; text-align: center;">
          <h1 style="margin: 0; font-size: 36px;">Author Event!</h1>
          <p style="margin: 10px 0 0 0; font-size: 20px;">Meet Ms. Arlene</p>
        </div>
        
        <div style="padding: 30px;">
          <p>Dear {{FIRST_NAME}},</p>
          
          <p>You're invited to an exclusive book signing and reading event with acclaimed author <strong>Ms. Arlene</strong>!</p>
          
          <div style="background: #fef2f2; padding: 25px; border-radius: 8px; margin: 25px 0; border: 2px solid #f87171;">
            <h3 style="color: #991b1b; margin-top: 0; text-align: center;">📅 Event Details</h3>
            <p style="text-align: center; margin: 10px 0;"><strong>Date:</strong> [Event Date]</p>
            <p style="text-align: center; margin: 10px 0;"><strong>Time:</strong> [Start Time] - [End Time]</p>
            <p style="text-align: center; margin: 10px 0;"><strong>Location:</strong> {{COMPANY_NAME}}</p>
            <p style="text-align: center; margin: 10px 0;"><strong>Address:</strong> [Full Address]</p>
          </div>
          
          <h3>Event Highlights:</h3>
          <ul style="line-height: 1.8;">
            <li>📖 Reading from [Book Title]</li>
            <li>✍️ Book signing and personalization</li>
            <li>💬 Q&A session with the author</li>
            <li>☕ Refreshments provided</li>
            <li>🎁 Special giveaways for attendees</li>
          </ul>
          
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <p style="margin: 0; text-align: center;"><strong>Early Bird Special!</strong><br>
Purchase [Book Title] before the event and receive a 20% discount plus priority signing line access.</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="background-color: #8b5cf6; color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">RSVP Now</a>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; text-align: center;">Seating is limited. Please RSVP by [RSVP deadline].</p>
          
          <p>We can't wait to see you there!</p>
          
          <p>Best regards,<br>
          The {{COMPANY_NAME}} Team</p>
        </div>
      </div>
    `,
    plainText: "You're invited to an exclusive book signing event with Ms. Arlene...",
    isSample: true,
  },
  {
    name: 'Music Release Announcement',
    category: TemplateCategory.BOOKSTORE_MEDIA,
    subject: '🎵 New Music from Ms. Arlene - [Song/Album Title]',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 40px; text-align: center;">
          <h1 style="margin: 0; font-size: 42px;">🎵</h1>
          <h2 style="margin: 10px 0;">New Release</h2>
          <h1 style="margin: 10px 0; font-size: 32px;">[Song/Album Title]</h1>
          <p style="margin: 5px 0 0 0; font-size: 18px; opacity: 0.9;">by Ms. Arlene</p>
        </div>
        
        <div style="padding: 30px;">
          <p>Dear {{FIRST_NAME}},</p>
          
          <p>I'm excited to share my latest musical creation with you! <strong>[Song/Album Title]</strong> is now available on all major streaming platforms.</p>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="color: #92400e; margin-top: 0;">About This Release</h3>
            <p>[Describe the music, inspiration, themes, genre, and what makes it special. Share the story behind the creation.]</p>
          </div>
          
          <h3>🎧 Listen Now On:</h3>
          <div style="text-align: center; margin: 25px 0;">
            <a href="#" style="display: inline-block; background-color: #1DB954; color: white; padding: 10px 25px; text-decoration: none; border-radius: 25px; margin: 5px;">Spotify</a>
            <a href="#" style="display: inline-block; background-color: #FA243C; color: white; padding: 10px 25px; text-decoration: none; border-radius: 25px; margin: 5px;">Apple Music</a>
            <a href="#" style="display: inline-block; background-color: #FF0000; color: white; padding: 10px 25px; text-decoration: none; border-radius: 25px; margin: 5px;">YouTube</a>
            <a href="#" style="display: inline-block; background-color: #F26F23; color: white; padding: 10px 25px; text-decoration: none; border-radius: 25px; margin: 5px;">SoundCloud</a>
          </div>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3b82f6;">
            <h3 style="color: #1e40af; margin-top: 0;">Support Independent Music</h3>
            <p>If you enjoy this release, please:</p>
            <ul>
              <li>Add it to your playlists</li>
              <li>Share it with friends</li>
              <li>Leave a review or comment</li>
              <li>Follow me on social media for updates</li>
            </ul>
          </div>
          
          <p>Your support means the world to me and helps me continue creating music that matters.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Listen Now</a>
          </div>
          
          <p>Thank you for being part of this musical journey!</p>
          
          <p>With gratitude,<br>
          <strong>Ms. Arlene</strong><br>
          {{WEBSITE}}</p>
        </div>
      </div>
    `,
    plainText: "I'm excited to share my latest musical creation with you...",
    isSample: true,
  },
  {
    name: 'Collaboration Proposal - Media Outlets',
    category: TemplateCategory.BOOKSTORE_MEDIA,
    subject: 'Collaboration Opportunity with Ms. Arlene',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Dear {{FIRST_NAME}},</p>
        
        <p>I've been following {{COMPANY_NAME}}'s work in [media space], and I'm impressed by your commitment to [values/mission that aligns with your work].</p>
        
        <p>My name is Ms. Arlene, and I'm an author and musician who creates content centered around [your themes]. I believe there's a valuable opportunity for us to collaborate in ways that serve both our audiences.</p>
        
        <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #1e40af; margin-top: 0;">Collaboration Ideas:</h3>
          <ul>
            <li><strong>Guest Articles/Blog Posts:</strong> I can contribute original content on [relevant topics]</li>
            <li><strong>Interview Features:</strong> Discussions about [relevant subjects]</li>
            <li><strong>Music/Audio Content:</strong> Original compositions for your podcasts or video content</li>
            <li><strong>Author Spotlights:</strong> Feature my books and the stories behind them</li>
            <li><strong>Social Media Takeovers:</strong> Engage your audience with behind-the-scenes content</li>
          </ul>
        </div>
        
        <h3>What I Bring:</h3>
        <ul style="line-height: 1.8;">
          <li>[X] years of experience in [field]</li>
          <li>Engaged audience of [number] followers across platforms</li>
          <li>Published works including [notable achievements]</li>
          <li>Professional-quality content creation capabilities</li>
        </ul>
        
        <div style="background: #fef3c7; padding: 15px; border-radius: 5px; margin: 25px 0;">
          <p style="margin: 0; text-align: center; color: #92400e;"><strong>📎 Portfolio & Media Kit Available</strong><br>
I'm happy to share samples of my work and detailed collaboration proposals.</p>
        </div>
        
        <p>I'd love to schedule a brief call to explore how we might work together to create valuable content for your audience.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Schedule a Call</a>
        </div>
        
        <p>Thank you for considering this opportunity. I look forward to potentially working together!</p>
        
        <p>Best regards,<br>
        <strong>Ms. Arlene</strong><br>
        Author & Musician<br>
        {{EMAIL_ADDRESS}}<br>
        {{WEBSITE}}<br>
        {{PHONE_NUMBERS}}</p>
      </div>
    `,
    plainText: 'Dear {{FIRST_NAME}},\n\nI\'ve been following {{COMPANY_NAME}}\'s work...',
    isSample: true,
  },

  // General Business Templates
  {
    name: 'Professional Introduction',
    category: TemplateCategory.GENERAL_BUSINESS,
    subject: 'Introduction - Potential Partnership Opportunity',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Dear {{FIRST_NAME}},</p>
        
        <p>I hope this email finds you well. My name is [Your Name], and I'm reaching out because I believe there may be a mutually beneficial opportunity for our organizations to work together.</p>
        
        <p>I've been following {{COMPANY_NAME}}'s work in [industry/field], particularly [specific achievement or initiative], and I'm impressed by your approach to [specific aspect].</p>
        
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #10b981;">
          <h3 style="color: #065f46; margin-top: 0;">About [Your Company]</h3>
          <p>We specialize in [brief description of what you do and who you serve]. Our clients have experienced [specific results or benefits].</p>
        </div>
        
        <h3>How We Might Work Together:</h3>
        <ul style="line-height: 1.8;">
          <li>[Specific collaboration idea #1]</li>
          <li>[Specific collaboration idea #2]</li>
          <li>[Specific collaboration idea #3]</li>
        </ul>
        
        <p>I'd welcome the opportunity to learn more about your current initiatives and explore whether there's a fit. Would you be open to a brief 15-minute introductory call?</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Schedule a Call</a>
        </div>
        
        <p>Thank you for your time and consideration.</p>
        
        <p>Best regards,<br>
        <strong>[Your Name]</strong><br>
        [Your Title]<br>
        [Your Company]<br>
        {{PHONE_NUMBERS}}<br>
        {{WEBSITE}}</p>
      </div>
    `,
    plainText: 'Dear {{FIRST_NAME}},\n\nI hope this email finds you well...',
    isSample: true,
  },
  {
    name: 'Follow-Up Email',
    category: TemplateCategory.GENERAL_BUSINESS,
    subject: 'Following Up - [Previous Topic]',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Hi {{FIRST_NAME}},</p>
        
        <p>I wanted to follow up on my previous email regarding [topic/opportunity]. I understand you're busy, so I'll keep this brief.</p>
        
        <div style="background: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Quick Recap:</strong> [One sentence summary of your previous email or conversation]</p>
        </div>
        
        <p>I believe this could be valuable for {{COMPANY_NAME}} because:</p>
        <ul>
          <li>[Key benefit #1]</li>
          <li>[Key benefit #2]</li>
          <li>[Key benefit #3]</li>
        </ul>
        
        <p>If now isn't the right time, I completely understand. If you'd like to explore this further, I'm happy to work around your schedule for a quick conversation.</p>
        
        <p>Just let me know what works best for you.</p>
        
        <p>Thanks again,<br>
        [Your Name]</p>
      </div>
    `,
    plainText: 'Hi {{FIRST_NAME}},\n\nI wanted to follow up on my previous email...',
    isSample: true,
  },
  {
    name: 'Product-Service Announcement',
    category: TemplateCategory.GENERAL_BUSINESS,
    subject: 'Introducing [Product/Service Name]',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0;">Introducing</h1>
          <h2 style="margin: 10px 0; font-size: 36px;">[Product/Service Name]</h2>
        </div>
        
        <div style="padding: 30px;">
          <p>Hi {{FIRST_NAME}},</p>
          
          <p>I'm excited to introduce [Product/Service Name], designed specifically to help [target audience] [achieve specific outcome].</p>
          
          <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">Why [Product/Service Name]?</h3>
            <p>[2-3 sentences explaining the problem it solves and why it's different from alternatives]</p>
          </div>
          
          <h3>Key Features:</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
            <div style="background: #f9fafb; padding: 15px; border-radius: 5px;">
              <h4 style="color: #3b82f6; margin-top: 0;">✓ [Feature 1]</h4>
              <p style="margin: 0; font-size: 14px; color: #6b7280;">[Brief description]</p>
            </div>
            <div style="background: #f9fafb; padding: 15px; border-radius: 5px;">
              <h4 style="color: #3b82f6; margin-top: 0;">✓ [Feature 2]</h4>
              <p style="margin: 0; font-size: 14px; color: #6b7280;">[Brief description]</p>
            </div>
            <div style="background: #f9fafb; padding: 15px; border-radius: 5px;">
              <h4 style="color: #3b82f6; margin-top: 0;">✓ [Feature 3]</h4>
              <p style="margin: 0; font-size: 14px; color: #6b7280;">[Brief description]</p>
            </div>
            <div style="background: #f9fafb; padding: 15px; border-radius: 5px;">
              <h4 style="color: #3b82f6; margin-top: 0;">✓ [Feature 4]</h4>
              <p style="margin: 0; font-size: 14px; color: #6b7280;">[Brief description]</p>
            </div>
          </div>
          
          <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
            <h3 style="color: #166534; margin-top: 0;">🎁 Limited Time Offer</h3>
            <p style="margin: 0; font-size: 18px;"><strong>[Discount/Special Offer Details]</strong></p>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #166534;">Valid until [Date]</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Learn More</a>
          </div>
          
          <p>Have questions? Reply to this email or visit {{WEBSITE}} for more information.</p>
          
          <p>Best regards,<br>
          [Your Name]<br>
          [Your Company]</p>
        </div>
      </div>
    `,
    plainText: 'Hi {{FIRST_NAME}},\n\nI\'m excited to introduce [Product/Service Name]...',
    isSample: true,
  },
  {
    name: 'Thank You Note',
    category: TemplateCategory.GENERAL_BUSINESS,
    subject: 'Thank You, {{FIRST_NAME}}!',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f0fdf4; padding: 30px; text-align: center; border-bottom: 3px solid #10b981;">
          <h1 style="color: #065f46; margin: 0;">Thank You!</h1>
        </div>
        
        <div style="padding: 30px;">
          <p>Dear {{FIRST_NAME}},</p>
          
          <p>I wanted to take a moment to personally thank you for [specific action: attending our event, purchasing our product, scheduling a meeting, etc.].</p>
          
          <p>[Add 1-2 sentences about why their action matters or what impact it has. Make it personal and genuine.]</p>
          
          <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; font-style: italic;">
              "[Optional: Add a meaningful quote or personal message that reinforces your gratitude]"</p>
          </div>
          
          <h3>What's Next?</h3>
          <p>[Provide clear next steps or information about what they can expect moving forward]</p>
          
          <p>If you have any questions or need assistance with anything, please don't hesitate to reach out. I'm here to help!</p>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 5px; margin: 25px 0; text-align: center;">
            <p style="margin: 0;"><strong>Need Help?</strong></p>
            <p style="margin: 5px 0 0 0;">Email: {{EMAIL_ADDRESS}} | Phone: {{PHONE_NUMBERS}}</p>
          </div>
          
          <p>Thanks again for your support. It truly means the world to us!</p>
          
          <p>Warmest regards,<br>
          <strong>[Your Name]</strong><br>
          [Your Title]<br>
          [Your Company]</p>
        </div>
      </div>
    `,
    plainText: 'Dear {{FIRST_NAME}},\n\nI wanted to take a moment to personally thank you...',
    isSample: true,
  },
  {
    name: 'Quarterly Newsletter',
    category: TemplateCategory.GENERAL_BUSINESS,
    subject: '[Company Name] Q1 2026 Newsletter',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1f2937; color: white; padding: 25px;">
          <h1 style="margin: 0;">[Company Name]</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Quarterly Newsletter - Q1 2026</p>
        </div>
        
        <div style="padding: 30px;">
          <p>Hi {{FIRST_NAME}},</p>
          
          <p>Welcome to our quarterly newsletter! Here's what's been happening at [Company Name] and what's coming up.</p>
          
          <div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937;">📈 Q1 Highlights</h2>
            <ul style="line-height: 1.8;">
              <li>[Achievement or milestone #1]</li>
              <li>[Achievement or milestone #2]</li>
              <li>[Achievement or milestone #3]</li>
              <li>[Achievement or milestone #4]</li>
            </ul>
          </div>
          
          <div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937;">🚀 New Launches</h2>
            <div style="background: #eff6ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <h4 style="color: #1e40af; margin-top: 0;">[Product/Service/Initiative Name]</h4>
              <p style="margin: 0; color: #1f2937;">[Brief description and why it matters to your audience]</p>
              <p style="margin: 10px 0 0 0;"><a href="#" style="color: #3b82f6;">Learn more →</a></p>
            </div>
          </div>
          
          <div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937;">📚 Resources & Insights</h2>
            <ul>
              <li><a href="#" style="color: #3b82f6;">[Blog Post/Resource Title 1]</a></li>
              <li><a href="#" style="color: #3b82f6;">[Blog Post/Resource Title 2]</a></li>
              <li><a href="#" style="color: #3b82f6;">[Blog Post/Resource Title 3]</a></li>
            </ul>
          </div>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="color: #92400e; margin-top: 0;">📅 Upcoming Events</h3>
            <ul style="margin: 0; color: #1f2937;">
              <li><strong>[Date]:</strong> [Event Name] - <a href="#" style="color: #d97706;">Register</a></li>
              <li><strong>[Date]:</strong> [Event Name] - <a href="#" style="color: #d97706;">Register</a></li>
            </ul>
          </div>
          
          <p>Thank you for being part of our community. We're excited about what's ahead!</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{WEBSITE}}" style="background-color: #1f2937; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Visit Our Website</a>
          </div>
          
          <p>Best regards,<br>
          The [Company Name] Team</p>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
          <p style="margin: 0;">© 2026 [Company Name]. All rights reserved.</p>
          <p style="margin: 10px 0 0 0;">
            <a href="#" style="color: #6b7280; margin: 0 10px;">Update Preferences</a> |
            <a href="#" style="color: #6b7280; margin: 0 10px;">Unsubscribe</a>
          </p>
        </div>
      </div>
    `,
    plainText: 'Hi {{FIRST_NAME}},\n\nWelcome to our quarterly newsletter...',
    isSample: true,
  },
];

async function main() {
  console.log('Starting seed...');

  // Create mandatory test user
  const hashedPasswordTest = await bcrypt.hash('johndoe123', 12);
  const testUser = await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      password: hashedPasswordTest,
      name: 'John Doe',
    },
  });

  console.log('Created test user:', testUser.email);

  // Create admin user
  const hashedPasswordAdmin = await bcrypt.hash('ONSE@Hermes', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'docwritereview1@gmail.com' },
    update: {},
    create: {
      email: 'docwritereview1@gmail.com',
      password: hashedPasswordAdmin,
      name: 'Admin User',
    },
  });

  console.log('Created admin user:', adminUser.email);

  // Create sample templates for both users
  for (const user of [testUser, adminUser]) {
    for (const template of sampleTemplates) {
      // Generate a safe ID by replacing all non-alphanumeric characters with dashes
      const safeId = `sample-${user.id}-${template.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')}`;
      
      await prisma.emailTemplate.upsert({
        where: {
          id: safeId,
        },
        update: {},
        create: {
          id: safeId,
          userId: user.id,
          ...template,
        },
      });
    }
  }

  console.log(`Created ${sampleTemplates.length * 2} sample templates (for 2 users)`);
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
