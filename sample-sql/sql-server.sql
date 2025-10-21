SELECT DISTINCT
    CONCAT(poeh.pono, '-', FORMAT(poeh.posuf, '00')) AS "PO#",
    poeh.orderdt AS "Order Date",
    poel.ackdt AS "Acknowledged Date",
    poel.shipprod AS "Martin Product ID",
    icsec.prod AS "Customer Product #",
    icsec.addprtinfo AS "Item Desc",
    icsw.vendprod AS "Vendor Product",
    icsp.lookupnm AS "MFG Part #",
    CASE 
        WHEN poel.nonstockty IS NULL THEN 'Stock Item'
        ELSE 'Non-Stock Item'
    END AS "Non-Stock Type",
    poel.qtyord AS "Qty Ordered",
    poel.price * 1.12 AS "Price",
    (poel.price * 1.12) * poel.qtyord AS "Total"
FROM
    poel
    INNER JOIN poeh ON poel.pono = poeh.pono AND poel.posuf = poeh.posuf
    INNER JOIN icsp ON poel.shipprod = icsp.prod
    LEFT JOIN icsec ON poel.shipprod = icsec.altprod
    INNER JOIN apsv ON poeh.vendno = apsv.vendno
    INNER JOIN icsd ON poeh.whse = icsd.whse
    INNER JOIN icsw ON icsec.altprod = icsw.prod
WHERE
    poel.whse = '5500'
    AND poeh.stagecd IN (1, 2, 3)
    AND icsec.custno = '313541'
ORDER BY
    poeh.orderdt DESC;