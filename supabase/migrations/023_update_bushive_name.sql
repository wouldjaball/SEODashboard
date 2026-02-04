-- Update company name from 'Bus Hive' to 'BusHive' 
-- Change from two words to single word format for consistency

-- Update the company name
UPDATE companies 
SET name = 'BusHive'
WHERE name = 'Bus Hive';

-- Verify the update
DO $$
DECLARE
  updated_count INTEGER;
  bushive_record RECORD;
BEGIN
  -- Check if the update was successful
  SELECT COUNT(*) INTO updated_count FROM companies WHERE name = 'BusHive';
  
  IF updated_count > 0 THEN
    -- Get the BusHive record details
    SELECT * INTO bushive_record FROM companies WHERE name = 'BusHive';
    RAISE NOTICE 'Successfully updated company name to "BusHive"';
    RAISE NOTICE 'Company ID: %, Industry: %, Color: %', 
      bushive_record.id, bushive_record.industry, bushive_record.color;
  ELSE
    RAISE NOTICE 'No company named "Bus Hive" found to update';
  END IF;

  -- List all companies for verification
  RAISE NOTICE 'All companies in database:';
  FOR bushive_record IN (SELECT id, name, industry FROM companies ORDER BY name) LOOP
    RAISE NOTICE '- %: % (%)', bushive_record.name, bushive_record.id, bushive_record.industry;
  END LOOP;
END $$;