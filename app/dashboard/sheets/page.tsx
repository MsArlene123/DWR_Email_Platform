import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet as SheetIcon, Plus, ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getGoogleSheets(userId: string) {
  const sheets = await prisma.googleSheet.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return sheets;
}

export default async function GoogleSheetsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const sheets = await getGoogleSheets(session.user.id);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Google Sheets</h1>
          <p className="mt-2 text-gray-600">
            Connect your Google Sheets with recipient lists
          </p>
        </div>
        <Link href="/dashboard/sheets/add">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Sheet
          </Button>
        </Link>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex">
          <SheetIcon className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-900">
              Expected Sheet Structure
            </h3>
            <p className="mt-1 text-sm text-blue-700">
              Your Google Sheets should include columns: FIRST_NAME, LAST_NAME, EMAIL_ADDRESS, TITLE, COMPANY_NAME, WEBSITE, PHONE_NUMBERS
            </p>
          </div>
        </div>
      </div>

      {/* Sheets List */}
      {sheets.length === 0 ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
          <SheetIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No Google Sheets connected
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Add your first Google Sheet to import recipients
          </p>
          <div className="mt-6">
            <Link href="/dashboard/sheets/add">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Sheet
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sheets.map((sheet: any) => (
            <div
              key={sheet.id}
              className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="bg-green-100 rounded-lg p-3">
                  <SheetIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                {sheet.name}
              </h3>

              {/* Badge for sub-lists */}
              {sheet.parentSheetId && (
                <div className="mb-2">
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                    Sub-list {sheet.splitIndex} of {sheet.splitTotal}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-600">
                  {sheet.recipientCount} recipients
                </span>
                {!sheet.parentSheetId && (
                  <a
                    href={sheet.sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {new Date(sheet.createdAt).toLocaleDateString()}
                  </span>
                  <Link href={`/dashboard/sheets/${sheet.id}`}>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
