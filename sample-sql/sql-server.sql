SELECT DISTINCT
  Concat (poeh.pono, '-', Format (poeh.posuf, '00')) AS "PO#",
  CAST(poeh.vendno AS BIGINT) AS "Vendor #",
  apsv.NAME AS "Vendor Name",
  CASE poeh.stagecd
    WHEN 0 THEN 'Entered'
    WHEN 1 THEN 'Ordered'
    WHEN 2 THEN 'Printed'
    WHEN 3 THEN 'Acknowledged'
    WHEN 4 THEN 'Pre-receiving'
    WHEN 5 THEN 'Received'
    WHEN 6 THEN 'Costed'
    WHEN 7 THEN 'Closed'
    WHEN 9 THEN 'Cancelled'
    ELSE CONVERT(NVARCHAR (20), poeh.stagecd)
  END AS Stage,
  icsd.name AS "Warehouse Name",
  icsd.whse AS "Warehouse",
  poeh.orderdt AS "Order Date",
  poeh.duedt AS "Due Date",
  poel.shipprod AS "Martin Product ID",
  icsec.prod AS "Customer Product #",
  icsec.addprtinfo AS "Customer Product Information",
  icsw.vendprod AS "Vendor Product",
  poel.qtyord AS "Qty Ordered",
  poel.price * 1.12 AS "Price",
  (poel.price*1.12) * poel.qtyord AS "Total"
FROM
  poel
  INNER JOIN poeh ON poel.pono = poeh.pono
  AND poel.posuf = poeh.posuf
  INNER JOIN icsp ON poel.shipprod = icsp.prod
  LEFT JOIN icsec ON poel.shipprod = icsec.altprod
  INNER JOIN apsv ON poeh.vendno = apsv.vendno
  INNER JOIN icsd ON poeh.whse = icsd.whse
  INNER JOIN icsw ON icsec.altprod = icsw.prod
WHERE
  poel.whse = '5500'
  AND (
    poeh.stagecd = 1
    OR poeh.stagecd = 2
    OR poeh.stagecd = 3
  )
ORDER BY
  poeh.orderdt DESC