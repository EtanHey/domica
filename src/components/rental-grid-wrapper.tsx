import { RentalGrid } from './rental-grid';

export function RentalGridWrapper() {
  const messages = {
    loading: 'טוען...',
    noData: 'אין נתונים להצגה',
    networkError: 'שגיאת רשת',
  };

  return <RentalGrid messages={messages} />;
}
