<?xml version="1.0" encoding="UTF-8"?>
<sch:schema xmlns:sch="http://purl.oclc.org/dsdl/schematron"
            xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
            xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
            queryBinding="xslt2">

  <sch:title>Factur-X EN16931 Business Rules</sch:title>
  <sch:ns prefix="ram" uri="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"/>
  <sch:ns prefix="rsm" uri="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"/>

  <sch:pattern id="profile">
    <sch:title>Profile Validation</sch:title>
    <sch:rule context="//ram:GuidelineSpecifiedDocumentContextParameter/ram:ID">
      <sch:assert test="starts-with(., 'urn:factur-x.eu:1p0:en16931') or starts-with(., 'urn:cen.eu:en16931:2017')">
        Profile ID must start with 'urn:factur-x.eu:1p0:en16931' or 'urn:cen.eu:en16931:2017'
      </sch:assert>
    </sch:rule>
  </sch:pattern>

  <sch:pattern id="currency">
    <sch:title>Currency Validation</sch:title>
    <sch:rule context="//ram:InvoiceCurrencyCode">
      <sch:assert test=". = 'EUR'">
        Currency must be specified as EUR
      </sch:assert>
    </sch:rule>
  </sch:pattern>

  <sch:pattern id="dates">
    <sch:title>Date Validation</sch:title>
    <sch:rule context="//ram:IssueDateTime/udt:DateTimeString">
      <sch:assert test="@format = '102'">
        Date format must be '102' (YYYYMMDD)
      </sch:assert>
    </sch:rule>
  </sch:pattern>

  <sch:pattern id="amounts">
    <sch:title>Amount Validation</sch:title>
    <sch:rule context="//ram:LineTotalAmount">
      <sch:assert test="number(.) >= 0">
        Line total amount must be non-negative
      </sch:assert>
    </sch:rule>
    <sch:rule context="//ram:TaxTotalAmount">
      <sch:assert test="number(.) >= 0">
        Tax total amount must be non-negative
      </sch:assert>
    </sch:rule>
    <sch:rule context="//ram:GrandTotalAmount">
      <sch:assert test="number(.) >= 0">
        Grand total amount must be non-negative
      </sch:assert>
    </sch:rule>
  </sch:pattern>

  <sch:pattern id="taxes">
    <sch:title>Tax Validation</sch:title>
    <sch:rule context="//ram:ApplicableTradeTax">
      <sch:assert test="ram:TypeCode = 'VAT'">
        Tax type must be VAT
      </sch:assert>
      <sch:assert test="ram:CategoryCode = 'S'">
        Tax category must be Standard rate
      </sch:assert>
      <sch:assert test="number(ram:Percent) >= 0">
        Tax percentage must be non-negative
      </sch:assert>
    </sch:rule>
  </sch:pattern>

  <sch:pattern id="totals">
    <sch:title>Total Amount Validation</sch:title>
    <sch:rule context="//ram:SpecifiedTradeSettlementHeaderMonetarySummation">
      <sch:assert test="number(ram:LineTotalAmount) + number(ram:TaxTotalAmount) = number(ram:GrandTotalAmount)">
        Grand total must equal line total plus tax total
      </sch:assert>
    </sch:rule>
  </sch:pattern>

</sch:schema> 