export interface MockShipment {
  simulated: true;
  tracking: string;
  status: 'DELIVERED' | 'IN_TRANSIT';
  destinationMatches: boolean;
}

const shipments: Record<string, MockShipment> = {
  'DEMO-DELIVERED': { simulated: true, tracking: 'DEMO-DELIVERED', status: 'DELIVERED', destinationMatches: true },
  'DEMO-IN-TRANSIT': { simulated: true, tracking: 'DEMO-IN-TRANSIT', status: 'IN_TRANSIT', destinationMatches: true },
  'DEMO-WRONG-DESTINATION': { simulated: true, tracking: 'DEMO-WRONG-DESTINATION', status: 'DELIVERED', destinationMatches: false },
};

export function mockShipment(tracking: string): MockShipment | null {
  return shipments[tracking] ?? null;
}
