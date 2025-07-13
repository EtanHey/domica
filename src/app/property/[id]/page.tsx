import { notFound } from 'next/navigation';
import { PropertyDetail } from '@/components/property-detail';
import { supabase } from '@/lib/supabase';

interface PropertyPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getProperty(id: string) {
  const { data, error } = await supabase
    .from('properties')
    .select(
      `
      *,
      property_images(
        image_url,
        is_primary,
        image_order
      ),
      landlord:landlords(*),
      property_amenities(*),
      property_location(
        address,
        city,
        neighborhood,
        formatted_address
      )
    `
    )
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  // If this property has a master_property_id, fetch the master property
  let masterProperty = null;
  if (data.master_property_id) {
    const { data: master } = await supabase
      .from('properties')
      .select(
        `
        id, 
        title, 
        price_per_month,
        property_location(formatted_address, address, city, neighborhood)
      `
      )
      .eq('id', data.master_property_id)
      .single();
    masterProperty = master;
  }

  // If this is a master property, check for duplicates
  let duplicates: any[] = [];
  if (data.duplicate_status === 'master') {
    const { data: dupes } = await supabase
      .from('properties')
      .select(
        `
        id, 
        title, 
        price_per_month, 
        duplicate_status, 
        duplicate_score,
        property_location(formatted_address, address, city, neighborhood)
      `
      )
      .eq('master_property_id', data.id)
      .order('duplicate_score', { ascending: false });
    duplicates = dupes || [];
  }

  return {
    ...data,
    masterProperty,
    duplicates,
  };
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { id } = await params;
  const propertyData = await getProperty(id);

  if (!propertyData) {
    notFound();
  }

  const { masterProperty, duplicates, ...property } = propertyData;

  return (
    <PropertyDetail property={property} masterProperty={masterProperty} duplicates={duplicates} />
  );
}
