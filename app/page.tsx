import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, BarChart3, Users, Send, ArrowRight, CheckCircle2 } from 'lucide-react';

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-[hsl(210,100%,23%)] border-b border-[hsl(210,100%,30%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/dwr-logo.png"
              alt="DocWriteReview LLC Logo"
              width={180}
              height={89}
              className="h-12 w-auto"
              priority
            />
          </div>
          <div className="flex items-center gap-3">
            {session ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 bg-[hsl(43,89%,52%)] hover:bg-[hsl(43,89%,45%)] text-[hsl(210,100%,15%)] font-semibold px-5 py-2.5 rounded-full transition-colors text-sm"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-[hsl(43,89%,52%)] hover:bg-[hsl(43,89%,45%)] text-[hsl(210,100%,15%)] font-semibold px-5 py-2.5 rounded-full transition-colors text-sm"
              >
                Sign In
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-[hsl(210,100%,23%)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(210,100%,18%)] via-[hsl(210,100%,23%)] to-[hsl(210,80%,28%)]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Ccircle cx='2' cy='2' r='1'/%3E%3C/g%3E%3C/svg%3E")" }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-8">
              <Mail className="h-4 w-4 text-[hsl(43,89%,52%)]" />
              <span className="text-white/90 text-sm font-medium tracking-wide">EMAIL MARKETING PLATFORM</span>
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              <span className="text-white">Powerful Campaigns.</span>
              <br />
              <span className="text-[hsl(43,89%,52%)]">Meaningful Results.</span>
            </h1>
            <p className="font-[family-name:var(--font-body)] text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed">
              DocWriteReview&apos;s email marketing dashboard — crafted to manage campaigns,
              track engagement, and grow your audience with precision and ease.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {session ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 bg-[hsl(43,89%,52%)] hover:bg-[hsl(43,89%,45%)] text-[hsl(210,100%,15%)] font-bold px-8 py-3.5 rounded-full transition-colors text-base shadow-lg shadow-[hsl(43,89%,52%)]/20"
                >
                  Open Dashboard
                  <ArrowRight className="h-5 w-5" />
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 bg-[hsl(43,89%,52%)] hover:bg-[hsl(43,89%,45%)] text-[hsl(210,100%,15%)] font-bold px-8 py-3.5 rounded-full transition-colors text-base shadow-lg shadow-[hsl(43,89%,52%)]/20"
                >
                  Get Started
                  <ArrowRight className="h-5 w-5" />
                </Link>
              )}
              <a
                href="https://docwritereview.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-white/30 hover:border-white/50 text-white font-medium px-8 py-3.5 rounded-full transition-colors text-base"
              >
                Visit DocWriteReview.com
              </a>
            </div>
          </div>
        </div>
        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 80L60 73.3C120 66.7 240 53.3 360 46.7C480 40 600 40 720 46.7C840 53.3 960 66.7 1080 70C1200 73.3 1320 66.7 1380 63.3L1440 60V80H0Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-bold text-[hsl(210,100%,23%)] mb-4">
              Everything You Need to <span className="text-[hsl(43,89%,52%)]">Succeed</span>
            </h2>
            <p className="font-[family-name:var(--font-body)] text-lg text-gray-600 max-w-2xl mx-auto">
              A complete suite of tools to create, send, and measure your email marketing campaigns.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Mail,
                title: 'Campaign Management',
                description: 'Create and schedule professional email campaigns with our intuitive editor. Manage multiple campaigns across different audiences.',
              },
              {
                icon: Users,
                title: 'Audience Segmentation',
                description: 'Import contacts from Google Sheets, segment your audience, and target the right people with the right message at the right time.',
              },
              {
                icon: BarChart3,
                title: 'Analytics & Reporting',
                description: 'Track open rates, click-through rates, and engagement metrics in real time. Make data-driven decisions to improve performance.',
              },
              {
                icon: Send,
                title: 'Email Delivery',
                description: 'Reliable SMTP integration ensures your emails reach inboxes — not spam folders. Monitor delivery status for every campaign.',
              },
              {
                icon: CheckCircle2,
                title: 'Template Library',
                description: 'Choose from professionally designed templates or create your own. Personalize with dynamic fields for each recipient.',
              },
              {
                icon: ArrowRight,
                title: 'Automation Workflows',
                description: 'Set up automated sequences and follow-ups. Nurture leads from first contact to conversion without lifting a finger.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group bg-gray-50 hover:bg-white border border-gray-100 hover:border-[hsl(43,89%,52%)]/30 rounded-2xl p-8 transition-all duration-300 hover:shadow-lg hover:shadow-[hsl(43,89%,52%)]/5"
              >
                <div className="w-12 h-12 bg-[hsl(210,100%,23%)] rounded-xl flex items-center justify-center mb-5 group-hover:bg-[hsl(43,89%,52%)] transition-colors duration-300">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-[hsl(210,100%,23%)] mb-3">
                  {feature.title}
                </h3>
                <p className="font-[family-name:var(--font-body)] text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-[hsl(210,100%,23%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '$12M+', label: 'Grant Funding Secured' },
              { value: '85%', label: 'Success Rate' },
              { value: '25+', label: 'Years of Experience' },
              { value: '100%', label: 'Client Ownership' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-bold text-[hsl(43,89%,52%)] mb-2">
                  {stat.value}
                </div>
                <div className="font-[family-name:var(--font-body)] text-white/80 text-sm md:text-base">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-bold text-[hsl(210,100%,23%)] mb-6">
            Ready to Elevate Your Outreach?
          </h2>
          <p className="font-[family-name:var(--font-body)] text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
            Whether you&apos;re reaching nonprofits, law firms, or entrepreneurs —
            our email marketing tools help you connect with impact.
          </p>
          {session ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-[hsl(43,89%,52%)] hover:bg-[hsl(43,89%,45%)] text-[hsl(210,100%,15%)] font-bold px-8 py-3.5 rounded-full transition-colors text-base shadow-lg shadow-[hsl(43,89%,52%)]/20"
            >
              Go to Dashboard
              <ArrowRight className="h-5 w-5" />
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-[hsl(43,89%,52%)] hover:bg-[hsl(43,89%,45%)] text-[hsl(210,100%,15%)] font-bold px-8 py-3.5 rounded-full transition-colors text-base shadow-lg shadow-[hsl(43,89%,52%)]/20"
            >
              Sign In to Your Dashboard
              <ArrowRight className="h-5 w-5" />
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[hsl(210,100%,23%)] border-t border-[hsl(210,100%,30%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/dwr-logo.png"
                alt="DocWriteReview LLC"
                width={140}
                height={69}
                className="h-10 w-auto"
              />
            </div>
            <p className="font-[family-name:var(--font-body)] text-white/60 text-sm">
              &copy; {new Date().getFullYear()} DocWriteReview LLC. All rights reserved.
            </p>
            <a
              href="https://docwritereview.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[hsl(43,89%,52%)] hover:text-[hsl(43,89%,60%)] text-sm font-medium transition-colors"
            >
              docwritereview.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
