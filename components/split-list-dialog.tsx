'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Split, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface SplitListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheetId: string;
  sheetName: string;
  recipientCount: number;
  onSuccess: () => void;
}

export function SplitListDialog({
  open,
  onOpenChange,
  sheetId,
  sheetName,
  recipientCount,
  onSuccess,
}: SplitListDialogProps) {
  const [numberOfSplits, setNumberOfSplits] = useState(2);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const perList = Math.ceil(recipientCount / numberOfSplits);

  async function handleSplit() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sheets/${sheetId}/split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numberOfSplits }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to split list');
      }

      setResult(data);
      toast.success(data.message);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setResult(null);
    setNumberOfSplits(2);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Split className="h-5 w-5 text-blue-600" />
            Split List into Sub-Lists
          </DialogTitle>
        </DialogHeader>

        {result ? (
          // Success view
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-green-600">
              <CheckCircle className="h-6 w-6" />
              <span className="font-semibold">List split successfully!</span>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-sm text-gray-600">
                <strong>{sheetName}</strong> ({result.sourceSheet.totalRecipients} contacts)
                {' → '}
                {result.subLists.length} sub-lists
              </p>
              <div className="space-y-1">
                {result.subLists.map((sub: any) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between bg-white border rounded px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{sub.name}</span>
                    <span className="text-gray-500">{sub.recipientCount} contacts</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              <strong>Next steps:</strong> Create a separate campaign for each
              sub-list, using a different email account for each. This lets you
              send to all sub-lists simultaneously without hitting any single
              account's daily sending limit.
            </div>
          </div>
        ) : (
          // Input view
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              <p>
                <strong>Why split a list?</strong> If your email account has a
                daily sending limit (e.g., 500/day), splitting a large list into
                sub-lists lets you send from multiple accounts in parallel.
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium">
                Source List: <strong>{sheetName}</strong>
              </Label>
              <p className="text-sm text-gray-500 mt-1">
                {recipientCount} total contacts
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium">
                How many sub-lists do you need?
              </Label>
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="range"
                  min={2}
                  max={10}
                  value={numberOfSplits}
                  onChange={(e) => setNumberOfSplits(parseInt(e.target.value, 10))}
                  className="flex-1"
                />
                <span className="text-2xl font-bold text-blue-600 w-12 text-center">
                  {numberOfSplits}
                </span>
              </div>
              <div className="flex gap-1 mt-2">
                {[2, 3, 4, 5, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNumberOfSplits(n)}
                    className={`px-3 py-1 text-sm rounded border transition-colors ${
                      numberOfSplits === n
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="font-medium text-gray-700">Preview:</p>
              <p className="text-gray-600 mt-1">
                {numberOfSplits} sub-lists × ~{perList} contacts each
              </p>
              <p className="text-gray-600">
                Sub-lists will be named:
              </p>
              <div className="mt-1 space-y-1">
                {Array.from({ length: Math.min(numberOfSplits, 3) }, (_, i) => (
                  <div key={i} className="text-gray-500">
                    "{sheetName} {i + 1} of {numberOfSplits}"
                  </div>
                ))}
                {numberOfSplits > 3 && (
                  <div className="text-gray-400">... and {numberOfSplits - 3} more</div>
                )}
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
              <AlertCircle className="inline h-4 w-4 mr-1" />
              This creates {numberOfSplits} new sub-lists. The original list is
              not modified. You can delete the sub-lists later if needed.
            </div>
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                onClick={handleSplit}
                disabled={loading || recipientCount < numberOfSplits}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Splitting...
                  </>
                ) : (
                  <>
                    <Split className="h-4 w-4 mr-2" />
                    Split into {numberOfSplits} lists
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
