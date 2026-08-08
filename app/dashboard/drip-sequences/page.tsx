import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Workflow, Plus, PlayCircle, StopCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getDripSequences(userId: string) {
  const sequences = await prisma.dripSequence.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      emailAccount: true,
      steps: {
        orderBy: { stepOrder: 'asc' },
      },
    },
  });

  return sequences;
}

export default async function DripSequencesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const sequences = await getDripSequences(session.user.id);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Drip Sequences</h1>
          <p className="mt-2 text-gray-600">
            Create automated email sequences and funnels
          </p>
        </div>
        <Link href="/dashboard/drip-sequences/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Sequence
          </Button>
        </Link>
      </div>

      {/* Info Banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
        <div className="flex">
          <Workflow className="h-5 w-5 text-purple-600 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-purple-900">
              What are Drip Sequences?
            </h3>
            <p className="mt-1 text-sm text-purple-700">
              Drip sequences allow you to send automated email series with delays between each email (e.g., Day 0, Day 3, Day 7).
            </p>
          </div>
        </div>
      </div>

      {/* Sequences List */}
      {sequences.length === 0 ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
          <Workflow className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No drip sequences yet
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Create your first automated email sequence
          </p>
          <div className="mt-6">
            <Link href="/dashboard/drip-sequences/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Sequence
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sequences.map((sequence: any) => (
            <div
              key={sequence.id}
              className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="bg-purple-100 rounded-lg p-3">
                    <Workflow className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {sequence.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {sequence.steps?.length || 0} steps
                    </p>
                    {sequence.emailAccount ? (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Sends from: {sequence.emailAccount.email}
                      </p>
                    ) : (
                      <p className="text-xs text-amber-600 mt-0.5">
                        No email account assigned
                      </p>
                    )}
                  </div>
                </div>
                {sequence.isActive ? (
                  <PlayCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <StopCircle className="h-5 w-5 text-gray-400" />
                )}
              </div>

              {sequence.description && (
                <p className="text-sm text-gray-600 mb-4">
                  {sequence.description}
                </p>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    sequence.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {sequence.isActive ? 'Active' : 'Inactive'}
                </span>
                <Link href={`/dashboard/drip-sequences/${sequence.id}`}>
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
