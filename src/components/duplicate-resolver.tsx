'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Trash2, Loader2, GitMerge, Eye } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PropertyComparisonModal } from './property-comparison-modal';

interface DuplicateResolverProps {
  propertyId: string;
  similarProperties: any[];
  masterPropertyId?: string;
  currentProperty?: any;
}

export function DuplicateResolver({
  propertyId,
  similarProperties,
  masterPropertyId,
  currentProperty,
}: DuplicateResolverProps) {
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [selectedPropertyForComparison, setSelectedPropertyForComparison] = useState<any>(null);
  const [selectedMasterForDelete, setSelectedMasterForDelete] = useState<string>('');
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);
  const [mergeKeepId, setMergeKeepId] = useState<string>(propertyId);
  const router = useRouter();
  const { toast } = useToast();

  const handleMarkAsUnique = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/resolve-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          decision: 'unique',
          masterPropertyId: null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: '✅ הפעולה בוצעה בהצלחה',
          description: 'הנכס סומן כייחודי',
        });

        setTimeout(() => {
          router.refresh();
        }, 1000);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: '❌ שגיאה',
        description: error instanceof Error ? error.message : 'שגיאה בעדכון הסטטוס',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAsDuplicate = async () => {
    if (!selectedMasterForDelete) {
      toast({
        title: '❌ שגיאה',
        description: 'יש לבחור נכס מקור לפני המחיקה',
        variant: 'destructive',
      });
      return;
    }

    setShowDeleteDialog(false);
    setLoading(true);

    try {
      const response = await fetch('/api/resolve-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          decision: 'duplicate',
          masterPropertyId: selectedMasterForDelete,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: '✅ הפעולה בוצעה בהצלחה',
          description: 'הנכס סומן ככפול',
        });

        setTimeout(() => {
          router.refresh();
        }, 1000);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: '❌ שגיאה',
        description: error instanceof Error ? error.message : 'שגיאה בעדכון הסטטוס',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = async () => {
    if (selectedForMerge.length === 0) {
      toast({
        title: '❌ שגיאה',
        description: 'יש לבחור לפחות נכס אחד למיזוג',
        variant: 'destructive',
      });
      return;
    }

    setShowMergeDialog(false);
    setLoading(true);

    try {
      const allIds = [propertyId, ...selectedForMerge];
      const response = await fetch('/api/merge-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keepPropertyId: mergeKeepId,
          mergePropertyIds: allIds,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: '✅ הפעולה בוצעה בהצלחה',
          description: `${data.mergedCount} נכסים מוזגו בהצלחה`,
        });

        setTimeout(() => {
          if (mergeKeepId !== propertyId) {
            router.push(`/property/${mergeKeepId}`);
          } else {
            router.refresh();
          }
        }, 1000);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: '❌ שגיאה',
        description: error instanceof Error ? error.message : 'שגיאה במיזוג הנכסים',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>פתרון כפילות</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Show similar properties always */}
          {similarProperties.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold">נכסים דומים שנמצאו:</p>
              <div className="space-y-2">
                {similarProperties.map((property) => (
                  <div
                    key={property.id}
                    className="hover:bg-muted/50 block cursor-pointer rounded-lg border p-3 transition-colors"
                    onClick={() => {
                      setSelectedPropertyForComparison(property);
                      setShowComparisonModal(true);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{property.title}</p>
                        <p className="text-muted-foreground text-sm">
                          {property.location_text} • ₪{property.price_per_month}
                          {property.listing_type === 'rent' && '/חודש'}
                        </p>
                        {property.similarity_score && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            דמיון {property.similarity_score}%
                          </Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPropertyForComparison(property);
                          setShowComparisonModal(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {similarProperties.length === 0 && (
            <p className="text-muted-foreground py-4 text-center text-sm">לא נמצאו נכסים דומים</p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={handleMarkAsUnique}
              disabled={loading}
              className="flex-1"
              variant="default"
            >
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  מעדכן...
                </>
              ) : (
                <>
                  <CheckCircle className="ml-2 h-4 w-4" />
                  סמן כייחודי
                </>
              )}
            </Button>

            <Button
              onClick={() => {
                if (similarProperties.length === 0) {
                  toast({
                    title: '❌ שגיאה',
                    description: 'אין נכסים דומים לבחירה',
                    variant: 'destructive',
                  });
                  return;
                }
                if (similarProperties.length === 1) {
                  setSelectedMasterForDelete(similarProperties[0].id);
                }
                setShowDeleteDialog(true);
              }}
              disabled={loading || similarProperties.length === 0}
              className="flex-1"
              variant="destructive"
            >
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  מעדכן...
                </>
              ) : (
                <>
                  <Trash2 className="ml-2 h-4 w-4" />
                  סמן ככפול
                </>
              )}
            </Button>

            <Button
              onClick={() => {
                if (similarProperties.length === 0) {
                  toast({
                    title: '❌ שגיאה',
                    description: 'אין נכסים דומים למיזוג',
                    variant: 'destructive',
                  });
                  return;
                }
                setShowMergeDialog(true);
              }}
              disabled={loading || similarProperties.length === 0}
              className="flex-1"
              variant="secondary"
            >
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  מעדכן...
                </>
              ) : (
                <>
                  <GitMerge className="ml-2 h-4 w-4" />
                  מזג נכסים
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>אישור סימון ככפול</AlertDialogTitle>
            <AlertDialogDescription>
              {similarProperties.length > 1 ? (
                <div className="space-y-3">
                  <p>בחר את הנכס המקורי שאליו זהו כפול:</p>
                  <div className="space-y-2">
                    {similarProperties.map((property) => (
                      <label
                        key={property.id}
                        className="flex cursor-pointer items-center space-x-2 space-x-reverse"
                      >
                        <input
                          type="radio"
                          name="master"
                          value={property.id}
                          checked={selectedMasterForDelete === property.id}
                          onChange={(e) => setSelectedMasterForDelete(e.target.value)}
                          className="h-4 w-4"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{property.title}</p>
                          <p className="text-muted-foreground text-xs">
                            {property.location_text} • ₪{property.price_per_month}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <p>
                  האם אתה בטוח שברצונך לסמן נכס זה ככפול? הנכס יסומן למחיקה ולא יוצג יותר ברשימה
                  הראשית.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAsDuplicate}
              disabled={similarProperties.length > 1 && !selectedMasterForDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              אישור - סמן ככפול
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>מיזוג נכסים</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <p>בחר את הנכסים למיזוג ואת הנכס שיישאר כנכס הראשי:</p>

                <div className="space-y-3">
                  <p className="text-sm font-semibold">בחר נכסים למיזוג:</p>
                  <div className="max-h-60 space-y-2 overflow-y-auto">
                    {similarProperties.map((property) => (
                      <label
                        key={property.id}
                        className="hover:bg-muted flex cursor-pointer items-center space-x-2 space-x-reverse rounded p-2"
                      >
                        <input
                          type="checkbox"
                          checked={selectedForMerge.includes(property.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedForMerge([...selectedForMerge, property.id]);
                            } else {
                              setSelectedForMerge(
                                selectedForMerge.filter((id) => id !== property.id)
                              );
                            }
                          }}
                          className="h-4 w-4"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{property.title}</p>
                          <p className="text-muted-foreground text-xs">
                            {property.location_text} • ₪{property.price_per_month}
                            {property.similarity_score && ` • דמיון ${property.similarity_score}%`}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold">בחר נכס ראשי (שיישאר לאחר המיזוג):</p>
                  <div className="space-y-2">
                    <label className="hover:bg-muted flex cursor-pointer items-center space-x-2 space-x-reverse rounded p-2">
                      <input
                        type="radio"
                        name="keepProperty"
                        value={propertyId}
                        checked={mergeKeepId === propertyId}
                        onChange={(e) => setMergeKeepId(e.target.value)}
                        className="h-4 w-4"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">הנכס הנוכחי (בבדיקה)</p>
                      </div>
                    </label>
                    {selectedForMerge.map((id) => {
                      const property = similarProperties.find((r) => r.id === id);
                      if (!property) return null;
                      return (
                        <label
                          key={id}
                          className="hover:bg-muted flex cursor-pointer items-center space-x-2 space-x-reverse rounded p-2"
                        >
                          <input
                            type="radio"
                            name="keepProperty"
                            value={id}
                            checked={mergeKeepId === id}
                            onChange={(e) => setMergeKeepId(e.target.value)}
                            className="h-4 w-4"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{property.title}</p>
                            <p className="text-muted-foreground text-xs">
                              {property.location_text} • ₪{property.price_per_month}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleMerge} disabled={selectedForMerge.length === 0}>
              אישור מיזוג
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Comparison Modal */}
      {showComparisonModal && selectedPropertyForComparison && currentProperty && (
        <PropertyComparisonModal
          open={showComparisonModal}
          onOpenChange={setShowComparisonModal}
          property1={currentProperty}
          property2={selectedPropertyForComparison}
          onMarkAsUnique={() => {
            handleMarkAsUnique();
            setShowComparisonModal(false);
          }}
          onMarkAsDuplicate={async (keepId, duplicateId) => {
            setSelectedMasterForDelete(keepId);
            setShowComparisonModal(false);

            // Call the API directly since we have all the info
            setLoading(true);
            try {
              const response = await fetch('/api/resolve-duplicate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  propertyId: duplicateId,
                  decision: 'duplicate',
                  masterPropertyId: keepId,
                }),
              });

              const data = await response.json();

              if (response.ok) {
                toast({
                  title: '✅ הפעולה בוצעה בהצלחה',
                  description: 'הנכס סומן ככפול',
                });

                setTimeout(() => {
                  router.refresh();
                }, 1000);
              } else {
                throw new Error(data.error);
              }
            } catch (error) {
              toast({
                title: '❌ שגיאה',
                description: error instanceof Error ? error.message : 'שגיאה בעדכון הסטטוס',
                variant: 'destructive',
              });
            } finally {
              setLoading(false);
            }
          }}
        />
      )}
    </>
  );
}
