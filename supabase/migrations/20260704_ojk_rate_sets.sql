-- ═══════════════════════════════════════════════════════════════════════════
-- OJK rate CMS: move the statutory rate tables in services/ojkRates.ts (SEOJK
-- No. 6/SEOJK.05/2017) from hardcoded constants into a DB-backed, versioned,
-- admin-editable table, so future OJK circular updates don't require a code
-- deploy. Seeded with the exact values already live in ojkRates.ts.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.sp_ojk_rate_sets (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version            text NOT NULL,
  source_reference   text NOT NULL DEFAULT 'SEOJK No. 6/SEOJK.05/2017',
  effective_date     date NOT NULL DEFAULT CURRENT_DATE,
  is_active          boolean NOT NULL DEFAULT false,
  province_zones     jsonb NOT NULL,
  category_bands     jsonb NOT NULL,
  car_comp_min       jsonb NOT NULL,
  car_comp_mid       jsonb NOT NULL,
  car_comp_max       jsonb NOT NULL,
  car_tlo_min        jsonb NOT NULL,
  car_tlo_mid        jsonb NOT NULL,
  car_tlo_max        jsonb NOT NULL,
  moto_comp_min      numeric NOT NULL,
  moto_comp_mid      numeric NOT NULL,
  moto_comp_max      numeric NOT NULL,
  moto_tlo_min       jsonb NOT NULL,
  moto_tlo_mid       jsonb NOT NULL,
  moto_tlo_max       jsonb NOT NULL,
  addon_rates        jsonb NOT NULL,
  non_vehicle_rates  jsonb NOT NULL,
  notes              text,
  created_by         uuid REFERENCES public.sp_users(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Only one active rate set at a time.
CREATE UNIQUE INDEX IF NOT EXISTS sp_ojk_rate_sets_one_active
  ON public.sp_ojk_rate_sets ((is_active))
  WHERE is_active;

ALTER TABLE public.sp_ojk_rate_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_ojk_rate_sets_admin" ON public.sp_ojk_rate_sets
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "sp_ojk_rate_sets_read" ON public.sp_ojk_rate_sets
  FOR SELECT TO authenticated
  USING (is_active);

-- Seed: exact values currently hardcoded in services/ojkRates.ts.
INSERT INTO public.sp_ojk_rate_sets (
  version, source_reference, effective_date, is_active,
  province_zones, category_bands,
  car_comp_min, car_comp_mid, car_comp_max,
  car_tlo_min, car_tlo_mid, car_tlo_max,
  moto_comp_min, moto_comp_mid, moto_comp_max,
  moto_tlo_min, moto_tlo_mid, moto_tlo_max,
  addon_rates, non_vehicle_rates, notes
) VALUES (
  'SEOJK-6-2017-v1', 'SEOJK No. 6/SEOJK.05/2017', '2017-01-01', true,
  '{"Aceh":1,"Sumatera Utara":1,"Sumatera Barat":1,"Riau":1,"Kepulauan Riau":1,"Kepulauan Bangka Belitung":1,"Jambi":1,"Bengkulu":1,"Sumatera Selatan":1,"Lampung":1,"DKI Jakarta":2,"Jawa Barat":2,"Banten":2,"Jawa Tengah":3,"DI Yogyakarta":3,"Jawa Timur":3,"Bali":3,"Kalimantan Barat":3,"Kalimantan Tengah":3,"Kalimantan Selatan":3,"Kalimantan Timur":3,"Kalimantan Utara":3,"Sulawesi Utara":3,"Sulawesi Tengah":3,"Sulawesi Selatan":3,"Sulawesi Tenggara":3,"Gorontalo":3,"Sulawesi Barat":3,"Nusa Tenggara Barat":3,"Nusa Tenggara Timur":3,"Maluku":3,"Maluku Utara":3,"Papua":3,"Papua Barat":3,"Papua Barat Daya":3,"Papua Pegunungan":3,"Papua Tengah":3,"Papua Selatan":3}'::jsonb,
  '{"1":125000000,"2":200000000,"3":400000000,"4":800000000}'::jsonb,
  '{"1":{"1":0.0382,"2":0.0326,"3":0.0253},"2":{"1":0.0267,"2":0.0247,"3":0.0269},"3":{"1":0.0218,"2":0.0208,"3":0.0179},"4":{"1":0.0120,"2":0.0120,"3":0.0114},"5":{"1":0.0105,"2":0.0105,"3":0.0105}}'::jsonb,
  '{"1":{"1":0.0401,"2":0.0343,"3":0.0266},"2":{"1":0.0281,"2":0.0260,"3":0.0283},"3":{"1":0.0229,"2":0.0219,"3":0.0188},"4":{"1":0.0126,"2":0.0126,"3":0.0120},"5":{"1":0.0111,"2":0.0111,"3":0.0111}}'::jsonb,
  '{"1":{"1":0.0420,"2":0.0359,"3":0.0278},"2":{"1":0.0294,"2":0.0272,"3":0.0296},"3":{"1":0.0240,"2":0.0229,"3":0.0197},"4":{"1":0.0132,"2":0.0132,"3":0.0125},"5":{"1":0.0116,"2":0.0116,"3":0.0116}}'::jsonb,
  '{"1":{"1":0.0047,"2":0.0065,"3":0.0051},"2":{"1":0.0063,"2":0.0044,"3":0.0044},"3":{"1":0.0041,"2":0.0038,"3":0.0029},"4":{"1":0.0025,"2":0.0025,"3":0.0023},"5":{"1":0.0020,"2":0.0020,"3":0.0020}}'::jsonb,
  '{"1":{"1":0.0052,"2":0.0072,"3":0.0054},"2":{"1":0.0066,"2":0.0049,"3":0.0046},"3":{"1":0.0044,"2":0.0040,"3":0.0032},"4":{"1":0.0028,"2":0.0028,"3":0.0025},"5":{"1":0.0022,"2":0.0022,"3":0.0022}}'::jsonb,
  '{"1":{"1":0.0056,"2":0.0078,"3":0.0056},"2":{"1":0.0069,"2":0.0053,"3":0.0048},"3":{"1":0.0046,"2":0.0042,"3":0.0035},"4":{"1":0.0030,"2":0.0030,"3":0.0027},"5":{"1":0.0024,"2":0.0024,"3":0.0024}}'::jsonb,
  0.0318, 0.0334, 0.0350,
  '{"1":0.0176,"2":0.0180,"3":0.0067}'::jsonb,
  '{"1":0.0194,"2":0.0198,"3":0.0074}'::jsonb,
  '{"1":0.0211,"2":0.0216,"3":0.0080}'::jsonb,
  '{"flood":0.0015,"earthquake":0.0012,"srccComp":0.0005,"srccTlo":0.00035,"tplBand1Rate":0.01,"tplBand1Cap":25000000,"tplBand2Rate":0.005,"tplBand2Cap":25000000,"tplBand3Rate":0.0025,"tplBand3Cap":50000000,"paDriver":50000,"paPassengerPerSeat":25000}'::jsonb,
  '{"TRAVEL":{"domestic":{"min":0.0014,"mid":0.0017,"max":0.0020},"international":{"min":0.0025,"mid":0.0035,"max":0.0045},"label":"% dari nilai perjalanan"},"PA":{"label":"Rp per orang per tahun","bands":{"min":30000,"mid":75000,"max":120000}},"MPAR":{"label":"% dari nilai perangkat per tahun","bands":{"min":0.025,"mid":0.035,"max":0.045}}}'::jsonb,
  'Seed awal — nilai identik dengan konstanta services/ojkRates.ts sebelum migrasi ke CMS.'
)
ON CONFLICT DO NOTHING;
