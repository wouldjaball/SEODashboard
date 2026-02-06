-- Fix company name: Update 'Bushive' to 'Bus Hive' for better readability and consistency
-- This addresses the user access issue where "Bus Hive" was expected but "Bushive" was stored

-- Update the company name
UPDATE companies 
SET name = 'Bus Hive'
WHERE name = 'Bushive';

-- Verify the update
DO $$
DECLARE
  updated_count INTEGER;
  bushive_record RECORD;
BEGIN
  -- Check if the update was successful
  SELECT COUNT(*) INTO updated_count FROM companies WHERE name = 'Bus Hive';
  
  IF updated_count > 0 THEN
    -- Get the Bus Hive record details
    SELECT * INTO bushive_record FROM companies WHERE name = 'Bus Hive';
    RAISE NOTICE 'Successfully updated company name to "Bus Hive"';
    RAISE NOTICE 'Company ID: %, Industry: %, Color: %', 
      bushive_record.id, bushive_record.industry, bushive_record.color;
  ELSE
    RAISE NOTICE 'No company named "Bushive" found to update';
  END IF;

  -- List all companies for verification
  RAISE NOTICE 'All companies in database:';
  FOR bushive_record IN (SELECT id, name, industry FROM companies ORDER BY name) LOOP
    RAISE NOTICE '- %: % (%)', bushive_record.name, bushive_record.id, bushive_record.industry;
  END LOOP;
END $$;