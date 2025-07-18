
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DetailedBanknote } from '@/types';

interface BanknoteCatalogDetailMinimizedProps {
  banknote: DetailedBanknote;
}

const BanknoteCatalogDetailMinimized: React.FC<BanknoteCatalogDetailMinimizedProps> = ({ banknote }) => {
  return (
    <div className="space-y-4">
      {/* Basic Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="font-semibold text-sm text-muted-foreground">Country:</span>
              <p className="text-sm">{banknote.country || '-'}</p>
            </div>
            <div>
              <span className="font-semibold text-sm text-muted-foreground">Denomination:</span>
              <p className="text-sm">{banknote.denomination || '-'}</p>
            </div>
            <div>
              <span className="font-semibold text-sm text-muted-foreground">Pick Number:</span>
              <p className="text-sm">{banknote.pickNumber || '-'}</p>
            </div>
            <div>
              <span className="font-semibold text-sm text-muted-foreground">Extended Pick Number:</span>
              <p className="text-sm">{banknote.extendedPickNumber || '-'}</p>
            </div>
            <div>
              <span className="font-semibold text-sm text-muted-foreground">Year:</span>
              <p className="text-sm">{banknote.gregorianYear || banknote.year || '-'}</p>
            </div>
            <div>
              <span className="font-semibold text-sm text-muted-foreground">Category:</span>
              <p className="text-sm">{banknote.category || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Technical Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="font-semibold text-sm text-muted-foreground">Type:</span>
              <p className="text-sm">{banknote.type || '-'}</p>
            </div>
            <div>
              <span className="font-semibold text-sm text-muted-foreground">Printer:</span>
              <p className="text-sm">{banknote.printer || '-'}</p>
            </div>
            <div>
              <span className="font-semibold text-sm text-muted-foreground">Rarity:</span>
              <p className="text-sm">{banknote.rarity || '-'}</p>
            </div>
            <div>
              <span className="font-semibold text-sm text-muted-foreground">Colors:</span>
              <p className="text-sm">{banknote.colors || '-'}</p>
            </div>
            <div>
              <span className="font-semibold text-sm text-muted-foreground">Security Elements:</span>
              <p className="text-sm">{banknote.securityElement || '-'}</p>
            </div>
            <div>
              <span className="font-semibold text-sm text-muted-foreground">Serial Numbering:</span>
              <p className="text-sm">{banknote.serialNumbering || '-'}</p>
            </div>
            {banknote.dimensions && (
              <div>
                <span className="font-semibold text-sm text-muted-foreground">Dimensions:</span>
                <p className="text-sm">{banknote.dimensions}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sultan Information */}
      {banknote.sultanName && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Sultan Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="font-semibold text-sm text-muted-foreground">Sultan Name:</span>
              <p className="text-sm">{banknote.sultanName}</p>
            </div>
            {banknote.islamicYear && (
              <div>
                <span className="font-semibold text-sm text-muted-foreground">Islamic Year:</span>
                <p className="text-sm">{banknote.islamicYear}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Signatures and Seals */}
      {(banknote.signaturesFront || banknote.signaturesBack || banknote.sealNames) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Signatures & Seals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {banknote.signaturesFront && (
              <div>
                <span className="font-semibold text-sm text-muted-foreground">Signatures (Front):</span>
                <p className="text-sm">{banknote.signaturesFront}</p>
              </div>
            )}
            {banknote.signaturesBack && (
              <div>
                <span className="font-semibold text-sm text-muted-foreground">Signatures (Back):</span>
                <p className="text-sm">{banknote.signaturesBack}</p>
              </div>
            )}
            {banknote.sealNames && (
              <div>
                <span className="font-semibold text-sm text-muted-foreground">Seals:</span>
                <p className="text-sm">{banknote.sealNames}</p>
              </div>
            )}
            {banknote.watermark && (
              <div>
                <span className="font-semibold text-sm text-muted-foreground">Watermark:</span>
                <p className="text-sm">{banknote.watermark}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Descriptions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Descriptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {banknote.banknoteDescription && (
            <div>
              <span className="font-semibold text-sm text-muted-foreground">Banknote Description:</span>
              <p className="text-sm whitespace-pre-wrap">{banknote.banknoteDescription}</p>
            </div>
          )}
          {banknote.historicalDescription && (
            <div>
              <span className="font-semibold text-sm text-muted-foreground">Historical Description:</span>
              <p className="text-sm whitespace-pre-wrap">{banknote.historicalDescription}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BanknoteCatalogDetailMinimized;
