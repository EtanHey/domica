import { Yad2ScraperControls } from './yad2-scraper-controls';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

export function Yad2ScraperWrapper() {
  const messages = {
    title: 'יבוא מודעות מיד 2',
    description: 'יבוא אוטומטי של מודעות דירה מיד 2',
    urlLabel: 'כתובת יד 2',
    urlPlaceholder: 'הכנס כתובת URL של יד 2',
    importButton: 'יבוא דירה',
    importing: 'מייבא...',
    rentalExample: 'דוגמה: https://www.yad2.co.il/realestate/rent',
    saleExample: 'דוגמה: https://www.yad2.co.il/realestate/forsale',
    urlRequired: 'נא להזין כתובת URL',
    invalidUrl: 'כתובת URL לא חוקית',
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="scraper">
        <AccordionTrigger>כלי סריקה</AccordionTrigger>
        <AccordionContent>
          <Yad2ScraperControls messages={messages} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
