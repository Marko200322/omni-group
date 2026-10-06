# Website package quality proof - 20261006_101335

## Method

- Prod e2e fulfill for **landing, website-business, website-ecommerce** across **12** industries
- Opened real live URLs (HTTP + public API + visible body text)
- Gates: HTTP 200, client brand (not System Admin), no Omni chrome, multi-section industry-aware copy, ecommerce shop+catalog
- CSV: `C:\dev\omni group\docs\evidence\website-quality-probe-20261006_101335.csv`

## Summary

| Metric | Value |
|---|---:|
| Cells | 36 |
| PASS | 32 |
| FAIL | 4 |
| Verdict | **FAIL** |

## Pass/fail table

| Package | Industry | Status | Score | URL | FAIL reasons |
|---|---|---|---:|---|---|
| landing | fitness | **PASS** | 100 | https://omnigrouptech.com/sites/fitness-studio-ec05f56585cd-muwejfp9 |  |
| website-business | fitness | **FAIL** | 0 | - | The remote server returned an error: (502) Bad Gateway. |
| website-ecommerce | fitness | **PASS** | 100 | https://omnigrouptech.com/sites/fitness-studio-70d3df726531-muwelfki |  |
| landing | legal | **PASS** | 100 | https://omnigrouptech.com/sites/legal-studio-3ef44cf7a9f4-muweltp5 |  |
| website-business | legal | **PASS** | 100 | https://omnigrouptech.com/sites/legal-studio-0ba529d71a1a-muwem9sr |  |
| website-ecommerce | legal | **PASS** | 100 | https://omnigrouptech.com/sites/legal-studio-3a7f9e0942f5-muwemoy1 |  |
| landing | healthcare | **PASS** | 100 | https://omnigrouptech.com/sites/healthcare-studio-f373cb0673e9-muwen8s5 |  |
| website-business | healthcare | **PASS** | 100 | https://omnigrouptech.com/sites/healthcare-studio-c5707b8448c3-muwenm5z |  |
| website-ecommerce | healthcare | **PASS** | 100 | https://omnigrouptech.com/sites/healthcare-studio-7a349188a0ca-muweo0ov |  |
| landing | hospitality | **PASS** | 100 | https://omnigrouptech.com/sites/hospitality-studio-e2816fdc6716-muweojuk |  |
| website-business | hospitality | **PASS** | 100 | https://omnigrouptech.com/sites/hospitality-studio-2c7a195a21a9-muwep0pe |  |
| website-ecommerce | hospitality | **PASS** | 100 | https://omnigrouptech.com/sites/hospitality-studio-d6f2bf330af9-muwepgo7 |  |
| landing | construction | **PASS** | 100 | https://omnigrouptech.com/sites/construction-studio-1de25e0f30cd-muwepux2 |  |
| website-business | construction | **PASS** | 100 | https://omnigrouptech.com/sites/construction-studio-fe3e727f83ac-muweq9n6 |  |
| website-ecommerce | construction | **PASS** | 100 | https://omnigrouptech.com/sites/construction-studio-b3fae431ffab-muweqr7k |  |
| landing | finance | **PASS** | 100 | https://omnigrouptech.com/sites/finance-studio-edaa07a47ccd-muwer7fu |  |
| website-business | finance | **PASS** | 100 | https://omnigrouptech.com/sites/finance-studio-b4d0147e640b-muwermzs |  |
| website-ecommerce | finance | **PASS** | 100 | https://omnigrouptech.com/sites/finance-studio-18c4019537f3-muwes06a |  |
| landing | education | **PASS** | 100 | https://omnigrouptech.com/sites/education-studio-b9eba7bdeac0-muwesemm |  |
| website-business | education | **PASS** | 100 | https://omnigrouptech.com/sites/education-studio-edd1ad4b6588-muwesrv3 |  |
| website-ecommerce | education | **PASS** | 100 | https://omnigrouptech.com/sites/education-studio-16765e68a71d-muwet5h5 |  |
| landing | automotive | **PASS** | 100 | https://omnigrouptech.com/sites/automotive-studio-3493ce43b90b-muwetjmb |  |
| website-business | automotive | **PASS** | 100 | https://omnigrouptech.com/sites/automotive-studio-e06343d3a395-muwetwq4 |  |
| website-ecommerce | automotive | **PASS** | 100 | https://omnigrouptech.com/sites/automotive-studio-52a5102cf76d-muweubf3 |  |
| landing | beauty | **PASS** | 100 | https://omnigrouptech.com/sites/beauty-studio-28f5fd18d70a-muweuolm |  |
| website-business | beauty | **PASS** | 100 | https://omnigrouptech.com/sites/beauty-studio-c64aaec99ecb-muwev23l |  |
| website-ecommerce | beauty | **PASS** | 100 | https://omnigrouptech.com/sites/beauty-studio-f9ebfe8dac0e-muwevf4f |  |
| landing | ecommerce | **FAIL** | 80 | https://omnigrouptech.com/sites/e-commerce-store-35067437e489-muwevslu | industry_token_missing |
| website-business | ecommerce | **FAIL** | 80 | https://omnigrouptech.com/sites/e-commerce-store-dc58febdeb48-muwew5wk | industry_token_missing |
| website-ecommerce | ecommerce | **FAIL** | 80 | https://omnigrouptech.com/sites/e-commerce-store-5849f380f4f6-muwewj3b | industry_token_missing |
| landing | agriculture | **PASS** | 100 | https://omnigrouptech.com/sites/agriculture-studio-ab1b0ff5a061-muwewwc4 |  |
| website-business | agriculture | **PASS** | 100 | https://omnigrouptech.com/sites/agriculture-studio-0041a5729b24-muwex9lb |  |
| website-ecommerce | agriculture | **PASS** | 100 | https://omnigrouptech.com/sites/agriculture-studio-385a486bb493-muwexmuc |  |
| landing | marketing | **PASS** | 100 | https://omnigrouptech.com/sites/marketing-studio-1d8e202adfac-muwey0fx |  |
| website-business | marketing | **PASS** | 100 | https://omnigrouptech.com/sites/marketing-studio-66a0d02fcf2a-muweyduw |  |
| website-ecommerce | marketing | **PASS** | 100 | https://omnigrouptech.com/sites/marketing-studio-4d82cb835d97-muweyrlt |  |

## Notes

- Scores are quality gates (not matrix smoke). Matrix green alone is insufficient.
- Ecommerce shop UI is verified via API shop page + catalog count; default HTML view may open on Shop for ecommerce sites.

