SELECT w.whse + ' - ' + REPLACE(l.name, 'MARTIN SUPPLY ','') as WarehouseName, 
w.prod as CSD_ProductID, p.descrip_1 as ItemDesc1, p.descrip_2 as ItemDesc2, p.unitstock as StockingUOM, UPPER(w.statustype) as StockStaus,
w.qtyonhand as QtyOnHand, w.avgcost as Unit_Avg_Cost, w.qtyonhand * w.avgcost as InventoryValue, ISNULL(u.cogs, 0) as COGS_Past90Days,
CASE 
WHEN ISNULL(u.cogs,0) = 0 AND w.qtyonhand * w.avgcost = 0 THEN 0
WHEN ISNULL(u.cogs,0) = 0 AND w.qtyonhand * w.avgcost > 0 THEN 9999 
ELSE w.qtyonhand * w.avgcost / (u.cogs / 3) END AS Months_Inv_OnHand,
w.qtycommit as Qty_Committed, w.qtyonhand - w.qtycommit as QtyAvl, w.qtyonorder as QtyOnInboundPO, w.binloc1 as BinLoc1, w.orderpt as MIN, w.linept as MAX,
w.lastinvdt as LastInvoiceDate, w.lastrcptdt as LastReceiptDate, w.arpvendno as SupplierID, v.name as SupplierName
FROM icsw w 
JOIN icsp p ON w.cono = p.cono AND w.prod = p.prod
JOIN icsd l ON l.cono = w.cono and l.whse = w.whse
LEFT JOIN apsv v on v.cono = 1 and v.vendno = w.arpvendno
LEFT JOIN 
(SELECT WHSE, SHIPPROD, SUM(COGS) AS COGS
FROM
(SELECT L.WHSE, L.SHIPPROD, 
CASE WHEN UPPER(H.TRANSTYPE) = 'RM' THEN GLCOST * QTYSHIP * -1 ELSE GLCOST * QTYSHIP END AS COGS
FROM OEEL L
JOIN OEEH H ON H.CONO = L.CONO AND H.ORDERNO = L.ORDERNO AND H.ORDERSUF = L.ORDERSUF
WHERE H.CONO = 1 
AND H.STAGECD IN (4, 5)
AND DATEDIFF(DAY,H.INVOICEDT,GETDATE()) <= 90
AND UPPER(L.BOTYPE) <> 'D') X
GROUP BY WHSE, SHIPPROD) u on u.whse = w.whse and u.shipprod = w.prod