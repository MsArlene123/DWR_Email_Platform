import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { seedSampleTemplatesForUser } from '@/lib/seed-sample-templates';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Folder, Eye } from 'lucide-react';

export const dynamic = 'force-dynamic';

const categoryLabels: Record<string, string> = {
  NONPROFIT: 'Nonprofit',
  ATTORNEY_LEGAL: 'Attorney/Legal',
  BOOKSTORE_MEDIA: 'Bookstore/Media',
  GENERAL_BUSINESS: 'General Business',
  CUSTOM: 'Custom',
  PRESS_MEDIA: 'Press/Media',
  LAWYERS: 'Lawyers',
  WOMEN_OWNED_BUSINESS: 'Women Owned Business',
  SHELTER_HOUSING: 'Shelter/Housing',
  CHILDCARE: 'Childcare',
  HEALTHCARE_CLINIC: 'Healthcare Clinic',
  SPIRITUAL_HEALING: 'Spiritual Healing',
  WOMEN_MONEY: 'Women & Money',
  SUPPORTIVE_GROWTH_COUNSELORS: 'Supportive Growth and Counselors',
  LEGAL_RESOURCES: 'Legal Resources',
  EMPLOYMENT: 'Employment',
  EDUCATION: 'Education',
  AFFILIATES: 'Affiliates',
  LEGAL_AID: 'Legal Aid',
  CREDIT_COUNSELING: 'Credit Counseling',
  HUD_COUNSELORS: 'HUD Counselors',
};

const categoryColors: Record<string, string> = {
  NONPROFIT: 'bg-blue-100 text-blue-700',
  ATTORNEY_LEGAL: 'bg-purple-100 text-purple-700',
  BOOKSTORE_MEDIA: 'bg-pink-100 text-pink-700',
  GENERAL_BUSINESS: 'bg-green-100 text-green-700',
  CUSTOM: 'bg-gray-100 text-gray-700',
  PRESS_MEDIA: 'bg-red-100 text-red-700',
  LAWYERS: 'bg-indigo-100 text-indigo-700',
  WOMEN_OWNED_BUSINESS: 'bg-rose-100 text-rose-700',
  SHELTER_HOUSING: 'bg-amber-100 text-amber-700',
  CHILDCARE: 'bg-yellow-100 text-yellow-700',
  HEALTHCARE_CLINIC: 'bg-teal-100 text-teal-700',
  SPIRITUAL_HEALING: 'bg-violet-100 text-violet-700',
  WOMEN_MONEY: 'bg-emerald-100 text-emerald-700',
  SUPPORTIVE_GROWTH_COUNSELORS: 'bg-cyan-100 text-cyan-700',
  LEGAL_RESOURCES: 'bg-slate-100 text-slate-700',
  EMPLOYMENT: 'bg-lime-100 text-lime-700',
  EDUCATION: 'bg-orange-100 text-orange-700',
  AFFILIATES: 'bg-fuchsia-100 text-fuchsia-700',
  LEGAL_AID: 'bg-sky-100 text-sky-700',
  CREDIT_COUNSELING: 'bg-green-100 text-green-700',
  HUD_COUNSELORS: 'bg-blue-100 text-blue-700',
};

async function getTemplates(userId: string) {
  // Auto-seed sample templates for new users
  await seedSampleTemplatesForUser(userId);

  const templates = await prisma.emailTemplate.findMany({
    where: { userId },
    orderBy: [
      { isSample: 'desc' },
      { category: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  return templates;
}

export default async function TemplatesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const templates = await getTemplates(session.user.id);

  // Group by category
  const groupedTemplates = templates.reduce((acc: any, template: any) => {
    const category = template.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {});

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Email Templates</h1>
          <p className="mt-2 text-gray-600">
            Manage your email templates and create new ones
          </p>
        </div>
        <Link href="/dashboard/templates/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </Link>
      </div>

      {/* Templates Grid */}
      {Object.keys(groupedTemplates).length === 0 ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No templates yet
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first template
          </p>
          <div className="mt-6">
            <Link href="/dashboard/templates/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedTemplates).map(([category, templates]: [string, any]) => (
            <div key={category}>
              <div className="flex items-center mb-4">
                <Folder className="h-5 w-5 text-gray-500 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">
                  {categoryLabels[category] || category}
                </h2>
                <span className="ml-3 text-sm text-gray-500">
                  ({templates.length} {templates.length === 1 ? 'template' : 'templates'})
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template: any) => (
                  <div
                    key={template.id}
                    className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            categoryColors[category] || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {categoryLabels[category] || category}
                        </span>
                        {template.isSample && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Sample
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                        {template.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-1">
                        {template.subject}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {new Date(template.createdAt).toLocaleDateString()}
                        </span>
                        <Link href={`/dashboard/templates/${template.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="mr-1 h-4 w-4" />
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
