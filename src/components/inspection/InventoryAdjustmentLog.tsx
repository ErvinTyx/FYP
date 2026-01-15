import { ArrowRight, Package, Calendar, User, Eye } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { InventoryAdjustment } from '../../types/inspection';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

interface InventoryAdjustmentLogProps {
  adjustments: InventoryAdjustment[];
  searchQuery: string;
  onViewReference?: (referenceId: string, referenceType: string) => void;
}

export function InventoryAdjustmentLog({ adjustments, searchQuery, onViewReference }: InventoryAdjustmentLogProps) {
  const filteredAdjustments = adjustments.filter(adj =>
    adj.scaffoldingItemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    adj.referenceId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getAdjustmentTypeColor = (type: InventoryAdjustment['adjustmentType']) => {
    const colors = {
      'damage-detected': 'bg-red-100 text-red-800',
      'repair-completed': 'bg-green-100 text-green-800',
      'scrapped': 'bg-gray-100 text-gray-800'
    };
    return colors[type];
  };

  const getAdjustmentTypeLabel = (type: InventoryAdjustment['adjustmentType']) => {
    const labels = {
      'damage-detected': 'Damage Detected',
      'repair-completed': 'Repair Completed',
      'scrapped': 'Scrapped'
    };
    return labels[type];
  };

  if (filteredAdjustments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package className="size-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No inventory adjustments found</p>
          <p className="text-sm text-gray-500 mt-2">
            {searchQuery ? 'Try adjusting your search' : 'Inventory adjustments will appear here automatically'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort by date, newest first
  const sortedAdjustments = [...filteredAdjustments].sort((a, b) => 
    new Date(b.adjustedAt).getTime() - new Date(a.adjustedAt).getTime()
  );

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
                <TableHead>Status Change</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Adjusted By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAdjustments.map(adjustment => (
                <TableRow key={adjustment.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="size-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-[#231F20]">
                          {new Date(adjustment.adjustedAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(adjustment.adjustedAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="size-4 text-gray-400" />
                      <span className="text-[#231F20]">{adjustment.scaffoldingItemName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-[#231F20] px-2 py-1 bg-gray-100 rounded">
                      {adjustment.quantity}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {adjustment.fromStatus}
                      </Badge>
                      <ArrowRight className="size-3 text-gray-400" />
                      <Badge variant="outline" className="text-xs">
                        {adjustment.toStatus}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getAdjustmentTypeColor(adjustment.adjustmentType)}>
                      {getAdjustmentTypeLabel(adjustment.adjustmentType)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm text-[#231F20]">{adjustment.referenceId}</p>
                      <p className="text-xs text-gray-500">{adjustment.referenceType}</p>
                      {onViewReference && (
                        <Button
                          size="sm"
                          className="mt-2"
                          onClick={() => onViewReference(adjustment.referenceId, adjustment.referenceType)}
                        >
                          <Eye className="size-4 mr-1" />
                          View
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="size-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{adjustment.adjustedBy}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}