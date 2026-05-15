                    -- Allow logging off-platform trip distance when full odometer readings are unknown.
                    -- miles_driven remains generated from start/end when both are set; otherwise hosts
                    -- can store host_reported_trip_miles for external-calendar claims.

                    ALTER TABLE public.vehicle_mileage_logs
                      ADD COLUMN IF NOT EXISTS host_reported_trip_miles int;

                    COMMENT ON COLUMN public.vehicle_mileage_logs.host_reported_trip_miles IS
                      'Host-entered trip miles for external calendar blocks when start/end odometer are unknown.';
