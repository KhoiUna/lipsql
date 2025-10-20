SELECT TOP 5 z.custno as CustomerID, c.name as CustomerName, z.shipprod as CSD_ItemNo, 
p.descrip_1 as ItemDesc1, p.descrip_2 as ItemDesc2, 
z.qtyship as QtyShipped_Past6Mo, z.UOM as ShippedUOM, z.totalsales as TotalSales, z.Total_Rebated_COGS, z.GrossProfit,
CASE WHEN TotalSales = 0 then 0 ELSE ROUND((TotalSales - Total_Rebated_COGS) / TotalSales * 100, 2) END AS MarginPct,
z.TimesInvoiced as TimesInvoiced_Past6Mo, p.unitstock as StockingUOM,
c.whse + ' - ' + REPLACE(l.name,'MARTIN SUPPLY ','') as 'Customer_Primary_Warehouse', w.qtyonhand as QOH_PrimaryWH, 
w.qtycommit as QtyCommitted, w.qtyonhand - w.qtycommit as QtyAvl,
UPPER(w.statustype) as StockStatus, w.orderpt as MIN, w.linept as MAX, w.qtyonorder as QtyOnOrder, s.name as CustomerSalesRep
FROM
(SELECT CUSTNO, SHIPPROD, UOM, SUM(QTYSHIP) AS QTYSHIP, ROUND(SUM(Total_Rebated_COGS),2) AS Total_Rebated_COGS, COUNT(*) as TimesInvoiced, SUM(totalsales) as TotalSales, 
ROUND(SUM(GrossProfit), 2) as GrossProfit
FROM
(SELECT L.INVOICEDT, H.CUSTNO, L.WHSE, UPPER(H.TRANSTYPE) AS TRANSTYPE, L.RETURNFL, L.ORDERNO, L.ORDERSUF, L.SHIPPROD, L.UNIT AS UOM,
CASE WHEN UPPER(H.TRANSTYPE) = 'RM' THEN L.QTYSHIP * -1 ELSE L.QTYSHIP END AS QTYSHIP, 
l.price as UnitPrice, l.prodcost as UnitCost, ISNULL(r.rebateamt,0) as UnitRebateAmnt, l.prodcost - ISNULL(r.rebateamt,0) as Rebated_Unit_Cost,
CASE WHEN UPPER(H.TRANSTYPE) = 'RM' THEN l.qtyship * l.price * -1 ELSE l.qtyship * l.price END AS TotalSales, 
CASE WHEN UPPER(H.TRANSTYPE) = 'RM' THEN l.qtyship * (l.prodcost - ISNULL(r.rebateamt,0)) * -1 ELSE l.qtyship * (prodcost - ISNULL(r.rebateamt,0)) END AS Total_Rebated_COGS,
CASE WHEN UPPER(h.transtype) = 'RM' THEN l.qtyship * (l.price + ISNULL(r.rebateamt,0) - l.prodcost) * -1 ELSE l.qtyship * (l.price + ISNULL(r.rebateamt,0) - l.prodcost) END AS GrossProfit
FROM OEEL L
JOIN OEEH H ON H.CONO = L.CONO AND H.ORDERNO = L.ORDERNO AND H.ORDERSUF = L.ORDERSUF
LEFT JOIN pder r on r.cono = l.cono and r.orderno = l.orderno and r.ordersuf = l.ordersuf and r.[lineno] = l.[lineno]
WHERE L.CONO = 1
AND H.STAGECD IN (4, 5)
AND DATEDIFF(DAY,H.INVOICEDT,GETDATE()) <= 180) X 
GROUP BY CUSTNO, SHIPPROD, UOM) z 
JOIN ARSC c on c.cono = 1 and c.custno = z.custno
LEFT JOIN ICSW w on w.cono = 1 and w.whse = c.whse and w.prod = z.shipprod
LEFT JOIN ICSP p on p.cono = 1 and p.prod = z.shipprod
LEFT JOIN ICSD l on l.cono = 1 and l.whse = c.whse
LEFT JOIN SMSN s on s.cono = 1 and s.slsrep = c.slsrepout