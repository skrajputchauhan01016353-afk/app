import React, { useState } from "react";
import { api } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Lock, ShoppingCart, Check } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { formatPrice } from "@/components/BatchCard";

/**
 * Enroll/Buy button.
 * - If batch is free → POST /enrollments/self/{id}
 * - If batch is paid → POST /payments/checkout/{id} (Razorpay-ready; MOCKED until keys live)
 * Calls onSuccess() after enrollment to allow parent refresh.
 */
export default function BuyButton({ batch, onSuccess, className = "" }) {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isFree = !batch.price || batch.price === 0;

  if (batch.is_enrolled) {
    return (
      <Button disabled className={`w-full bg-emerald-500/95 hover:bg-emerald-500/95 text-white rounded-lg ${className}`} data-testid={`purchased-badge-${batch.id}`}>
        <Check className="h-4 w-4 mr-2" /> Purchased
      </Button>
    );
  }

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (isFree) {
        await api.post(`/enrollments/self/${batch.id}`);
        toast.success(`Enrolled in ${batch.name}`);
      } else {
        const { data } = await api.post(`/payments/checkout/${batch.id}`);
        if (data?.mock) {
          toast.success(`Payment success (demo) · enrolled in ${batch.name}`);
        } else {
          toast.success(`Enrolled in ${batch.name}`);
        }
      }
      setConfirmOpen(false);
      onSuccess?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not complete enrollment");
    } finally { setLoading(false); }
  };

  const triggerLabel = isFree ? (
    <><ShoppingCart className="h-4 w-4 mr-2" /> Enroll Free</>
  ) : (
    <><ShoppingCart className="h-4 w-4 mr-2" /> Buy Now · {formatPrice(batch.price, batch.currency)}</>
  );

  return (
    <>
      <Button
        onClick={() => setConfirmOpen(true)}
        className={`w-full ${isFree ? "bg-[#1D4ED8] hover:bg-[#1E40AF]" : "bg-[#F97316] hover:bg-[#EA580C]"} text-white rounded-lg ${className}`}
        data-testid={`buy-btn-${batch.id}`}
      >
        {triggerLabel}
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent data-testid={`buy-dialog-${batch.id}`}>
          <DialogHeader>
            <DialogTitle>{isFree ? "Enroll in this batch?" : `Complete purchase`}</DialogTitle>
            <DialogDescription className="pt-2">
              <span className="block font-semibold text-slate-900">{batch.name}</span>
              <span className="block text-slate-500 mt-1">{batch.description}</span>
              {!isFree && (
                <span className="block mt-3 text-base">
                  Amount: <span className="font-bold text-[#F97316]">{formatPrice(batch.price, batch.currency)}</span>
                </span>
              )}
              {!isFree && (
                <span className="block text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md p-2 mt-3">
                  <Lock className="inline h-3 w-3 mr-1" />
                  Payment gateway integration is ready — currently in demo mode; clicking "Confirm" will unlock access instantly. Razorpay will replace this flow once keys are added.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} data-testid={`buy-cancel-${batch.id}`}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={loading} className={isFree ? "bg-[#1D4ED8] hover:bg-[#1E40AF] text-white" : "bg-[#F97316] hover:bg-[#EA580C] text-white"} data-testid={`buy-confirm-${batch.id}`}>
              {loading ? "Processing..." : isFree ? "Enroll" : "Confirm & Pay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
