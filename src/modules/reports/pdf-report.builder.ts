import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { InspectionStatus } from '../../common/enums';
import { IInspectionReportData } from './interfaces/report.interface';

@Injectable()
export class PdfReportBuilder {
  async buildPdfBuffer(data: IInspectionReportData): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
        bufferPages: true,
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const printableWidth = 515; // 595.28 - 2*40
      const leftMargin = 40;

      // Color Palette
      const primaryColor = '#1E3A8A'; // Deep Navy
      const secondaryColor = '#0369A1'; // Ocean Blue
      const darkText = '#1F2937'; // Slate Charcoal
      const mutedText = '#6B7280'; // Medium Gray
      const lightBg = '#F3F4F6'; // Card background
      const borderColor = '#E5E7EB'; // Border

      const ensureSpace = (neededHeight: number) => {
        if (doc.y + neededHeight > 770) {
          doc.addPage();
          renderMinimalHeader();
        }
      };

      const renderMinimalHeader = () => {
        doc.save();
        doc.rect(leftMargin, 30, printableWidth, 2).fill(primaryColor);
        doc.font('Helvetica-Bold').fontSize(8).fillColor(mutedText);
        doc.text('GHARPROOF VERIFIED REPORT', leftMargin, 18, { align: 'left' });
        doc.font('Helvetica').fontSize(8).fillColor(mutedText);
        doc.text(`Rental Ref: ${data.rental._id.toString()}`, leftMargin, 18, { align: 'right' });
        doc.restore();
        doc.y = 45;
      };

      // -------------------------------------------------------------
      // 1. BRAND HEADER
      // -------------------------------------------------------------
      doc.rect(leftMargin, 38, printableWidth, 68).fill(primaryColor);

      doc.font('Helvetica-Bold').fontSize(20).fillColor('#FFFFFF');
      doc.text('GHARPROOF', leftMargin + 16, 50);

      doc.font('Helvetica').fontSize(9).fillColor('#93C5FD');
      doc.text('Tamper-Proof Rental Deposit Verification & Settlement', leftMargin + 16, 73);

      doc.font('Helvetica-Bold').fontSize(10).fillColor('#FFFFFF');
      doc.text('OFFICIAL AUDIT REPORT', leftMargin, 55, {
        align: 'right',
        width: printableWidth - 16,
      });

      doc.font('Helvetica').fontSize(8).fillColor('#E0F2FE');
      doc.text(`Generated: ${new Date().toISOString().split('T')[0]}`, leftMargin, 73, {
        align: 'right',
        width: printableWidth - 16,
      });

      doc.y = 120;

      // -------------------------------------------------------------
      // 2. RENTAL PROPERTY & TENANCY PARTICULARS
      // -------------------------------------------------------------
      doc.font('Helvetica-Bold').fontSize(12).fillColor(primaryColor);
      doc.text('1. TENANCY PARTICULARS', leftMargin, doc.y);
      doc.y += 6;

      const rentalBoxY = doc.y;
      doc
        .roundedRect(leftMargin, rentalBoxY, printableWidth, 90, 4)
        .fillAndStroke(lightBg, borderColor);

      const landlord = data.rental.landlordId as any;
      const tenant = data.rental.tenantId as any;
      const addr = data.rental.propertyAddress;
      const formattedAddr = `${addr.line1}${addr.line2 ? ', ' + addr.line2 : ''}, ${addr.city}, ${addr.state} - ${addr.postalCode}`;

      const col1X = leftMargin + 12;
      const col2X = leftMargin + 265;
      let lineY = rentalBoxY + 10;

      // Column 1: Property & Term
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkText);
      doc.text('Property Address: ', col1X, lineY, { continued: true });
      doc.font('Helvetica').text(formattedAddr);

      lineY += 16;
      doc.font('Helvetica-Bold').text('Lease Term: ', col1X, lineY, { continued: true });
      const startDate = new Date(data.rental.startDate).toLocaleDateString('en-IN');
      const endDate = data.rental.endDate
        ? new Date(data.rental.endDate).toLocaleDateString('en-IN')
        : 'Ongoing';
      doc.font('Helvetica').text(`${startDate} — ${endDate}`);

      lineY += 16;
      doc.font('Helvetica-Bold').text('Monthly Rent: ', col1X, lineY, { continued: true });
      doc.font('Helvetica').text(`INR ${data.rental.monthlyRent.toLocaleString('en-IN')}`);

      lineY += 16;
      doc.font('Helvetica-Bold').text('Security Deposit: ', col1X, lineY, { continued: true });
      doc
        .font('Helvetica-Bold')
        .fillColor(secondaryColor)
        .text(`INR ${data.rental.depositAmount.toLocaleString('en-IN')}`);

      // Column 2: Parties
      let col2Y = rentalBoxY + 10;
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkText);
      doc.text('Landlord: ', col2X, col2Y, { continued: true });
      doc.font('Helvetica').text(`${landlord?.name || 'N/A'} (${landlord?.email || 'N/A'})`);

      col2Y += 16;
      doc.font('Helvetica-Bold').text('Tenant: ', col2X, col2Y, { continued: true });
      doc
        .font('Helvetica')
        .text(
          `${tenant?.name || 'N/A'} (${tenant?.email || data.rental.tenantInviteEmail || 'N/A'})`,
        );

      col2Y += 16;
      doc.font('Helvetica-Bold').text('Rental Status: ', col2X, col2Y, { continued: true });
      doc.font('Helvetica').text(data.rental.status.toUpperCase());

      doc.y = rentalBoxY + 102;

      // -------------------------------------------------------------
      // 3. CRYPTOGRAPHIC VERIFICATION CERTIFICATE
      // -------------------------------------------------------------
      doc.font('Helvetica-Bold').fontSize(12).fillColor(primaryColor);
      doc.text('2. CRYPTOGRAPHIC INTEGRITY CERTIFICATE', leftMargin, doc.y);
      doc.y += 6;

      const certBoxY = doc.y;
      doc
        .roundedRect(leftMargin, certBoxY, printableWidth, 100, 4)
        .fillAndStroke('#F8FAFC', borderColor);

      const moveInLocked = data.moveInInspection?.status === InspectionStatus.LOCKED;
      const moveOutLocked = data.moveOutInspection?.status === InspectionStatus.LOCKED;

      let certY = certBoxY + 10;

      // Move-In Certificate Block
      doc.font('Helvetica-Bold').fontSize(9).fillColor(darkText);
      doc.text(
        `Move-In Inspection Fingerprint [${moveInLocked ? 'VERIFIED & LOCKED' : 'PENDING'}]`,
        leftMargin + 12,
        certY,
      );
      certY += 14;
      doc.font('Courier').fontSize(7.5).fillColor(primaryColor);
      doc.text(
        data.moveInInspection?.rootHash
          ? `SHA-256: ${data.moveInInspection.rootHash}`
          : 'SHA-256: Hash pending dual sign-off',
        leftMargin + 12,
        certY,
      );

      certY += 18;
      // Move-Out Certificate Block
      doc.font('Helvetica-Bold').fontSize(9).fillColor(darkText);
      doc.text(
        `Move-Out Inspection Fingerprint [${moveOutLocked ? 'VERIFIED & LOCKED' : 'PENDING'}]`,
        leftMargin + 12,
        certY,
      );
      certY += 14;
      doc.font('Courier').fontSize(7.5).fillColor(primaryColor);
      doc.text(
        data.moveOutInspection?.rootHash
          ? `SHA-256: ${data.moveOutInspection.rootHash}`
          : 'SHA-256: Hash pending dual sign-off',
        leftMargin + 12,
        certY,
      );

      certY += 16;
      doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(mutedText);
      doc.text(
        'Integrity Note: Composite SHA-256 root hashes guarantee mathematical immutability over conditions, photos, and signatures.',
        leftMargin + 12,
        certY,
      );

      doc.y = certBoxY + 115;

      // -------------------------------------------------------------
      // 4. ROOM CONDITION COMPARISON TABLE
      // -------------------------------------------------------------
      ensureSpace(120);

      doc.font('Helvetica-Bold').fontSize(12).fillColor(primaryColor);
      doc.text('3. ROOM-BY-ROOM CONDITION COMPARISON', leftMargin, doc.y);
      doc.y += 6;

      // Table Header
      const tableX = leftMargin;
      const colWidths = [125, 75, 75, 110, 130];
      const tableHeaderY = doc.y;

      doc.rect(tableX, tableHeaderY, printableWidth, 20).fill(primaryColor);
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF');

      let currentX = tableX + 6;
      doc.text('Room & Item', currentX, tableHeaderY + 6);
      currentX += colWidths[0];
      doc.text('Move-In', currentX, tableHeaderY + 6);
      currentX += colWidths[1];
      doc.text('Move-Out', currentX, tableHeaderY + 6);
      currentX += colWidths[2];
      doc.text('Status / Diff', currentX, tableHeaderY + 6);
      currentX += colWidths[3];
      doc.text('Observations', currentX, tableHeaderY + 6);

      doc.y = tableHeaderY + 20;

      const comparisons = data.comparison?.comparisons || [];

      if (comparisons.length === 0) {
        doc.rect(tableX, doc.y, printableWidth, 22).fillAndStroke('#FFFFFF', borderColor);
        doc.font('Helvetica-Oblique').fontSize(8).fillColor(mutedText);
        doc.text('No inspection items recorded.', tableX + 10, doc.y + 6);
        doc.y += 22;
      } else {
        comparisons.forEach((item, index) => {
          ensureSpace(24);
          const rowY = doc.y;
          const isEven = index % 2 === 0;

          doc
            .rect(tableX, rowY, printableWidth, 22)
            .fillAndStroke(isEven ? '#FFFFFF' : '#F9FAFB', borderColor);

          doc.font('Helvetica-Bold').fontSize(8).fillColor(darkText);
          let colX = tableX + 6;
          doc.text(`${item.roomName} — ${item.itemName}`, colX, rowY + 6, {
            width: colWidths[0] - 8,
            ellipsis: true,
          });

          // Move In
          colX += colWidths[0];
          doc.font('Helvetica').fontSize(8).fillColor(darkText);
          doc.text(item.moveIn?.condition || '—', colX, rowY + 6, { width: colWidths[1] - 8 });

          // Move Out
          colX += colWidths[1];
          doc.text(item.moveOut?.condition || '—', colX, rowY + 6, { width: colWidths[2] - 8 });

          // Diff Status
          colX += colWidths[2];
          doc.font('Helvetica-Bold').fontSize(7.5);
          if (item.diffStatus === 'damaged_since_move_in') {
            doc.fillColor('#B91C1C'); // Red
          } else if (item.diffStatus === 'unchanged') {
            doc.fillColor('#047857'); // Green
          } else if (item.diffStatus === 'minor_wear') {
            doc.fillColor('#B45309'); // Amber
          } else {
            doc.fillColor(primaryColor);
          }
          doc.text(item.diffStatus.replace(/_/g, ' ').toUpperCase(), colX, rowY + 6, {
            width: colWidths[3] - 8,
            ellipsis: true,
          });

          // Notes
          colX += colWidths[3];
          doc.font('Helvetica').fontSize(7.5).fillColor(mutedText);
          const obs = item.moveOut?.notes || item.moveIn?.notes || '—';
          doc.text(obs, colX, rowY + 6, { width: colWidths[4] - 8, ellipsis: true });

          doc.y = rowY + 22;
        });
      }

      doc.y += 14;

      // -------------------------------------------------------------
      // 5. PHOTO EXHIBIT & SHA-256 CHECKSUMS
      // -------------------------------------------------------------
      const itemsWithPhotos = comparisons.filter(
        (c) =>
          (c.moveIn?.photos && c.moveIn.photos.length > 0) ||
          (c.moveOut?.photos && c.moveOut.photos.length > 0),
      );

      if (itemsWithPhotos.length > 0) {
        ensureSpace(80);
        doc.font('Helvetica-Bold').fontSize(12).fillColor(primaryColor);
        doc.text('4. PHOTO EXHIBITS & CRYPTOGRAPHIC HASHES', leftMargin, doc.y);
        doc.y += 6;

        itemsWithPhotos.forEach((item) => {
          ensureSpace(50);
          const itemBoxY = doc.y;
          doc
            .roundedRect(leftMargin, itemBoxY, printableWidth, 42, 3)
            .fillAndStroke('#F8FAFC', borderColor);

          doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkText);
          doc.text(`${item.roomName} — ${item.itemName}`, leftMargin + 10, itemBoxY + 6);

          let photoY = itemBoxY + 18;
          const allPhotos = [
            ...(item.moveIn?.photos || []).map((p: any) => ({ ...p, phase: 'Move-In' })),
            ...(item.moveOut?.photos || []).map((p: any) => ({ ...p, phase: 'Move-Out' })),
          ];

          allPhotos.slice(0, 2).forEach((p) => {
            doc.font('Helvetica').fontSize(7.5).fillColor(mutedText);
            doc.text(`${p.phase} Photo: `, leftMargin + 10, photoY, { continued: true });
            doc.font('Courier').fontSize(7).fillColor(primaryColor);
            doc.text(
              p.sha256Hash ? `SHA-256: ${p.sha256Hash}` : `File: ${p.fileName || 'Attached'}`,
            );
            photoY += 10;
          });

          doc.y = itemBoxY + 46;
        });

        doc.y += 10;
      }

      // -------------------------------------------------------------
      // 6. FINAL DEPOSIT RECONCILIATION & SETTLEMENT
      // -------------------------------------------------------------
      ensureSpace(160);

      doc.font('Helvetica-Bold').fontSize(12).fillColor(primaryColor);
      doc.text('5. FINAL DEPOSIT RECONCILIATION STATEMENT', leftMargin, doc.y);
      doc.y += 6;

      const settlement = data.settlement.settlement;
      const disputes = data.settlement.disputes || [];

      const settleBoxY = doc.y;
      const settleHeight = 85 + Math.min(disputes.length, 3) * 16;
      doc
        .roundedRect(leftMargin, settleBoxY, printableWidth, settleHeight, 4)
        .fillAndStroke(lightBg, borderColor);

      let sY = settleBoxY + 10;
      doc.font('Helvetica-Bold').fontSize(9).fillColor(darkText);
      doc.text('Starting Security Deposit Paid:', leftMargin + 12, sY);
      doc
        .font('Helvetica-Bold')
        .text(`INR ${settlement.depositAmount.toLocaleString('en-IN')}`, leftMargin, sY, {
          align: 'right',
          width: printableWidth - 12,
        });

      sY += 16;
      if (disputes.length > 0) {
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkText);
        doc.text('Itemized Agreed Deductions:', leftMargin + 12, sY);
        sY += 14;

        disputes.forEach((d) => {
          doc.font('Helvetica').fontSize(8).fillColor(darkText);
          const deductionAmount =
            d.agreedDeduction !== undefined
              ? d.agreedDeduction
              : d.resolved
                ? d.proposedDeduction
                : 0;
          doc.text(`• ${d.category.toUpperCase()} — ${d.description}`, leftMargin + 20, sY, {
            width: 320,
            ellipsis: true,
          });
          doc.font('Helvetica-Bold').fillColor('#DC2626');
          doc.text(`- INR ${deductionAmount.toLocaleString('en-IN')}`, leftMargin, sY, {
            align: 'right',
            width: printableWidth - 12,
          });
          sY += 14;
        });
      } else {
        doc.font('Helvetica-Oblique').fontSize(8).fillColor(mutedText);
        doc.text('No deductions claimed or disputed.', leftMargin + 12, sY);
        sY += 16;
      }

      // Net Refund Total Banner
      sY += 4;
      doc.rect(leftMargin + 8, sY, printableWidth - 16, 24).fill('#DCFCE7'); // Soft Emerald
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#166534');
      doc.text('FINAL REFUND PAYABLE TO TENANT:', leftMargin + 16, sY + 7);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#166534');
      doc.text(
        `INR ${settlement.estimatedRefundAmount.toLocaleString('en-IN')}`,
        leftMargin,
        sY + 6,
        {
          align: 'right',
          width: printableWidth - 20,
        },
      );

      doc.y = settleBoxY + settleHeight + 14;

      // -------------------------------------------------------------
      // 7. SIGNATURES & CLOSING ACKNOWLEDGMENT
      // -------------------------------------------------------------
      ensureSpace(80);

      const sigBoxY = doc.y;
      doc.rect(leftMargin, sigBoxY, printableWidth, 65).fillAndStroke('#FFFFFF', borderColor);

      const sigCol1 = leftMargin + 16;
      const sigCol2 = leftMargin + 270;

      doc.font('Helvetica-Bold').fontSize(8).fillColor(darkText);
      doc.text('LANDLORD SIGN-OFF', sigCol1, sigBoxY + 8);
      doc.font('Helvetica').fontSize(7.5).fillColor(mutedText);
      doc.text(`Name: ${landlord?.name || 'Landlord'}`, sigCol1, sigBoxY + 20);
      doc.text(
        `Signed: ${data.moveOutInspection?.landlordSigned ? 'Digital SHA-256 Acknowledged' : 'Pending'}`,
        sigCol1,
        sigBoxY + 30,
      );
      doc.text(
        `Date: ${data.moveOutInspection?.landlordSignedAt ? new Date(data.moveOutInspection.landlordSignedAt).toLocaleDateString('en-IN') : '—'}`,
        sigCol1,
        sigBoxY + 40,
      );

      doc.font('Helvetica-Bold').fontSize(8).fillColor(darkText);
      doc.text('TENANT SIGN-OFF', sigCol2, sigBoxY + 8);
      doc.font('Helvetica').fontSize(7.5).fillColor(mutedText);
      doc.text(`Name: ${tenant?.name || 'Tenant'}`, sigCol2, sigBoxY + 20);
      doc.text(
        `Signed: ${data.moveOutInspection?.tenantSigned ? 'Digital SHA-256 Acknowledged' : 'Pending'}`,
        sigCol2,
        sigBoxY + 30,
      );
      doc.text(
        `Date: ${data.moveOutInspection?.tenantSignedAt ? new Date(data.moveOutInspection.tenantSignedAt).toLocaleDateString('en-IN') : '—'}`,
        sigCol2,
        sigBoxY + 40,
      );

      // -------------------------------------------------------------
      // 8. RUNNING FOOTER (Applied to all pages)
      // -------------------------------------------------------------
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        doc.save();
        doc.rect(leftMargin, 805, printableWidth, 1).fill(borderColor);
        doc.font('Helvetica').fontSize(7.5).fillColor(mutedText);
        doc.text(
          'GharProof Certified Inspection Report • Cryptographically Secured Legal Record',
          leftMargin,
          812,
          { align: 'left' },
        );
        doc.text(`Page ${i + 1} of ${totalPages}`, leftMargin, 812, {
          align: 'right',
          width: printableWidth,
        });
        doc.restore();
      }

      doc.end();
    });
  }
}
