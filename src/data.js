/* Frozen synthetic scenario, keyed to PRD.md. Runtime reads constants only. */
(function (global) {
  "use strict";
  const data = {
    "schemaVersion": 1,
    "sourceRefs": [
      "D01",
      "D02",
      "D03",
      "D04",
      "D05",
      "D06",
      "D07",
      "D08",
      "D09",
      "D10",
      "D11",
      "D12",
      "D13",
      "D14",
      "D15",
      "D16",
      "D17",
      "D18",
      "D19",
      "D20",
      "D21",
      "D22",
      "D23",
      "D24",
      "D25",
      "D26",
      "D27",
      "D28",
      "D29",
      "D30",
      "D31",
      "D32",
      "P01",
      "P02",
      "P03",
      "P04",
      "P05",
      "P06",
      "P07",
      "P08",
      "E01",
      "E02",
      "E03",
      "E04",
      "E05",
      "E06",
      "E07",
      "E08"
    ],
    "project": {
      "ref": "D01",
      "id": "HBT-101",
      "customer": "Harbor Biotherapeutics",
      "modalityKey": "conventionalMab",
      "deliveryItemKey": "drugSubstance",
      "deliveryStatusKey": "released",
      "destinationKey": "newJerseyFormulationSite",
      "siteScopeKey": "originalSite",
      "developmentWorkstreams": [
        {
          "id": "cellLineBank",
          "statusKey": "completed"
        },
        {
          "id": "upstream",
          "statusKey": "completed"
        },
        {
          "id": "downstream",
          "statusKey": "atRisk"
        },
        {
          "id": "analytical",
          "statusKey": "inProgress"
        },
        {
          "id": "formulation",
          "statusKey": "inProgress"
        }
      ],
      "researchStatusKey": "completed"
    },
    "calendars": {
      "customer": {
        "ref": "D02",
        "timezone": "America/New_York",
        "weekdays": [
          1,
          2,
          3,
          4,
          5
        ],
        "startHour": 9,
        "endHour": 17,
        "holidays": []
      },
      "base": {
        "ref": "D02",
        "timezone": "Asia/Shanghai",
        "weekdays": [
          1,
          2,
          3,
          4,
          5
        ],
        "startHour": 9,
        "endHour": 17,
        "holidays": [
          "2027-01-01",
          "2027-02-05",
          "2027-02-06",
          "2027-02-07",
          "2027-02-08",
          "2027-02-09",
          "2027-02-10",
          "2027-02-11",
          "2027-02-12",
          "2027-04-05"
        ]
      },
      "continuous": {
        "ref": "D02",
        "hoursPerDay": 24,
        "coverageAssumed": true
      }
    },
    "initialClock": "2026-11-09T09:00:00-05:00",
    "baseline": {
      "ref": "D28",
      "needBy": "2027-03-19T17:00:00-04:00",
      "needByLocalDate": "2027-03-19",
      "timezone": "America/New_York",
      "deliveryGapUnit": "customerCalendarDays"
    },
    "people": {
      "P01": {
        "id": "P01",
        "ref": "P01",
        "name": "Emma Chen",
        "roleKey": "customerPM",
        "timezone": "America/New_York",
        "budgetLimit": 0,
        "statusKey": "available"
      },
      "P02": {
        "id": "P02",
        "ref": "P02",
        "name": "Daniel Reed",
        "roleKey": "technical",
        "timezone": "America/New_York",
        "budgetLimit": 0,
        "statusKey": "available"
      },
      "P03": {
        "id": "P03",
        "ref": "P03",
        "name": "Nina Patel",
        "roleKey": "quality",
        "timezone": "America/New_York",
        "budgetLimit": 0,
        "statusKey": "available"
      },
      "P04": {
        "id": "P04",
        "ref": "P04",
        "name": "Olivia Grant",
        "roleKey": "budget",
        "timezone": "America/New_York",
        "budgetLimit": 100000,
        "statusKey": "onLeave"
      },
      "P05": {
        "id": "P05",
        "ref": "P05",
        "name": "Ben Lewis",
        "roleKey": "budgetSupport",
        "timezone": "America/New_York",
        "budgetLimit": 0,
        "statusKey": "supportOnly"
      },
      "P06": {
        "id": "P06",
        "ref": "P06",
        "name": "Elena Torres",
        "roleKey": "budget",
        "timezone": "America/New_York",
        "budgetLimit": 100000,
        "statusKey": "available"
      },
      "P07": {
        "id": "P07",
        "ref": "P07",
        "name": "Alex Lin",
        "roleKey": "wuxiPM",
        "timezone": "Asia/Shanghai",
        "budgetLimit": 0,
        "statusKey": "available"
      },
      "P08": {
        "id": "P08",
        "ref": "P08",
        "name": "Mei Zhang",
        "roleKey": "scheduling",
        "timezone": "Asia/Shanghai",
        "budgetLimit": 0,
        "statusKey": "available"
      }
    },
    "risk": {
      "ref": "D04",
      "id": "purification-hmw",
      "statusKey": "aboveDevelopmentTarget",
      "publicationStatusKey": "published",
      "hmwPct": 2.8,
      "targetPct": 2.0,
      "measurementKey": "secHplcPeakArea",
      "sampleKey": "finalPurificationSmallScale",
      "reportRefs": [
        "SEC-001",
        "EXP-001",
        "Q-A",
        "Q-B"
      ],
      "publishedAt": "2026-11-09T16:00:00+08:00",
      "nextUpdateEvent": "reviewsComplete",
      "notGmpReleaseFailure": true,
      "nextUpdateOwnerId": "P07",
      "evidence": {
        "ref": "D04",
        "reportRef": "SEC-001",
        "sourceKey": "syntheticAnalyticalReport",
        "publisherId": "P07",
        "availableAtEvent": "materialReady"
      },
      "timeline": [
        {
          "id": "riskDiscovered",
          "eventRef": "riskDiscovered",
          "statusKey": "recorded",
          "ownerIds": [
            "P07"
          ]
        },
        {
          "id": "materialReady",
          "eventRef": "materialReady",
          "statusKey": "recorded",
          "ownerIds": [
            "P07"
          ]
        },
        {
          "id": "customerPacketAvailable",
          "eventRef": "customerPacketAvailable",
          "statusKey": "recorded",
          "ownerIds": [
            "P01",
            "P02",
            "P03"
          ]
        },
        {
          "id": "budgetOwnerNotified",
          "eventRef": "budgetOwnerNotified",
          "statusKey": "recorded",
          "ownerIds": [
            "P04"
          ]
        },
        {
          "id": "backupAssigned",
          "eventRef": "backupAssigned",
          "statusKey": "planned",
          "ownerIds": [
            "P01",
            "P05"
          ]
        },
        {
          "id": "alternateAssigned",
          "eventRef": "alternateAssigned",
          "statusKey": "planned",
          "ownerIds": [
            "P01",
            "P06"
          ]
        },
        {
          "id": "latestReviewStart",
          "eventRef": "latestReviewStart",
          "statusKey": "deadline",
          "ownerIds": [
            "P02",
            "P03"
          ]
        },
        {
          "id": "reviewsComplete",
          "eventRef": "reviewsComplete",
          "statusKey": "planned",
          "ownerIds": [
            "P02",
            "P03",
            "P06"
          ]
        },
        {
          "id": "budgetAuthorized",
          "eventRef": "budgetAuthorized",
          "statusKey": "planned",
          "ownerIds": [
            "P06"
          ]
        },
        {
          "id": "resourceConfirmed",
          "eventRef": "resourceConfirmed",
          "statusKey": "planned",
          "ownerIds": [
            "P07",
            "P08"
          ]
        },
        {
          "id": "latestAuthorization",
          "eventRef": "latestAuthorization",
          "statusKey": "deadline",
          "ownerIds": [
            "P06"
          ]
        },
        {
          "id": "resourceConfirmationDeadline",
          "eventRef": "resourceConfirmationDeadline",
          "statusKey": "deadline",
          "ownerIds": [
            "P08"
          ]
        },
        {
          "id": "A-finalAnalysis",
          "planId": "A",
          "stageId": "finalAnalysis",
          "endpoint": "end",
          "statusKey": "conditionalForecast",
          "ownerIds": [
            "P07"
          ]
        },
        {
          "id": "A-customerResultReview",
          "planId": "A",
          "stageId": "customerResultReview",
          "endpoint": "end",
          "statusKey": "conditionalForecast",
          "ownerIds": [
            "P02",
            "P03"
          ]
        },
        {
          "id": "A-windowUseConfirmation",
          "planId": "A",
          "stageId": "windowUseConfirmation",
          "endpoint": "end",
          "statusKey": "conditionalForecast",
          "ownerIds": [
            "P08"
          ]
        }
      ]
    },
    "reports": {
      "SEC-001": {
        "ref": "D05",
        "id": "SEC-001",
        "version": 1,
        "kindKey": "analyticalSummary",
        "synthetic": true
      },
      "EXP-001": {
        "ref": "D05",
        "id": "EXP-001",
        "version": 1,
        "kindKey": "experimentPlan",
        "synthetic": true
      },
      "Q-A": {
        "ref": "D05",
        "id": "Q-A",
        "version": 1,
        "kindKey": "quote",
        "plan": "A",
        "synthetic": true
      },
      "Q-B": {
        "ref": "D05",
        "id": "Q-B",
        "version": 1,
        "kindKey": "quote",
        "plan": "B",
        "synthetic": true
      }
    },
    "events": {
      "riskDiscovered": {
        "at": "2026-11-09T10:00:00+08:00",
        "ref": "D04",
        "actorIds": [
          "P07"
        ]
      },
      "materialReady": {
        "at": "2026-11-09T16:00:00+08:00",
        "ref": "D05",
        "actorIds": [
          "P07"
        ]
      },
      "customerPacketAvailable": {
        "at": "2026-11-09T09:00:00-05:00",
        "ref": "D06",
        "actorIds": [
          "P01",
          "P02",
          "P03"
        ]
      },
      "budgetOwnerNotified": {
        "at": "2026-11-09T09:00:00-05:00",
        "ref": "D06",
        "actorIds": [
          "P04"
        ]
      },
      "backupAssigned": {
        "at": "2026-11-09T11:00:00-05:00",
        "ref": "D06",
        "actorIds": [
          "P01",
          "P05"
        ]
      },
      "alternateAssigned": {
        "at": "2026-11-10T09:00:00-05:00",
        "ref": "D06",
        "actorIds": [
          "P01",
          "P06"
        ]
      },
      "reviewsComplete": {
        "at": "2026-11-11T17:00:00-05:00",
        "ref": "D11",
        "actorIds": [
          "P02",
          "P03",
          "P06"
        ]
      },
      "budgetStart": {
        "at": "2026-11-12T09:00:00-05:00",
        "ref": "D11",
        "actorIds": [
          "P06"
        ]
      },
      "budgetAuthorized": {
        "at": "2026-11-12T17:00:00-05:00",
        "ref": "D11",
        "actorIds": [
          "P06"
        ]
      },
      "resourceReviewStart": {
        "at": "2026-11-13T09:00:00+08:00",
        "ref": "D11",
        "actorIds": [
          "P07",
          "P08"
        ]
      },
      "resourceConfirmed": {
        "at": "2026-11-13T17:00:00+08:00",
        "ref": "D11",
        "actorIds": [
          "P07",
          "P08"
        ]
      },
      "resourceConfirmationDeadline": {
        "at": "2026-11-16T17:00:00+08:00",
        "ref": "D08",
        "actorIds": [
          "P08"
        ]
      },
      "customerResponseHandoff": {
        "at": "2026-11-16T09:00:00+08:00",
        "ref": "D09",
        "actorIds": [
          "P01"
        ]
      },
      "latestAuthorization": {
        "at": "2026-11-13T17:00:00-05:00",
        "ref": "D09",
        "actorIds": [
          "P06"
        ]
      },
      "latestReviewStart": {
        "at": "2026-11-10T09:00:00-05:00",
        "ref": "D10",
        "actorIds": [
          "P02",
          "P03"
        ]
      },
      "latestReviewComplete": {
        "at": "2026-11-12T17:00:00-05:00",
        "ref": "D10",
        "actorIds": [
          "P02",
          "P03"
        ]
      },
      "latestBudgetStart": {
        "at": "2026-11-13T09:00:00-05:00",
        "ref": "D10",
        "actorIds": [
          "P06"
        ]
      },
      "originalWindow": {
        "at": "2027-01-04T09:00:00+08:00",
        "ref": "D18",
        "actorIds": [
          "P08"
        ]
      },
      "candidateWindow": {
        "at": "2027-02-15T09:00:00+08:00",
        "ref": "D18",
        "actorIds": [
          "P08"
        ]
      },
      "rescheduleRequested": {
        "at": "2026-11-16T09:00:00+08:00",
        "ref": "E01",
        "actorIds": [
          "P07"
        ],
        "executionTimezone": "Asia/Shanghai",
        "timingKind": "startBy",
        "caseDesignAssumption": true
      },
      "rescheduleQuotePrepared": {
        "at": "2026-11-17T15:00:00+08:00",
        "ref": "E02",
        "actorIds": [
          "P08"
        ],
        "executionTimezone": "Asia/Shanghai",
        "timingKind": "expectedResponse",
        "caseDesignAssumption": true
      },
      "rescheduleQuoteReturned": {
        "at": "2026-11-17T17:00:00+08:00",
        "ref": "E03",
        "actorIds": [
          "P07"
        ],
        "executionTimezone": "Asia/Shanghai",
        "timingKind": "expectedResponse",
        "caseDesignAssumption": true
      },
      "rescheduleCustomerAvailable": {
        "at": "2026-11-17T09:00:00-05:00",
        "ref": "E04",
        "actorIds": [
          "P01",
          "P06"
        ],
        "executionTimezone": "America/New_York",
        "timingKind": "available",
        "caseDesignAssumption": true
      },
      "rescheduleDecisionCreated": {
        "at": "2026-11-17T10:00:00-05:00",
        "ref": "E05",
        "actorIds": [
          "P01"
        ],
        "executionTimezone": "America/New_York",
        "timingKind": "plannedAction",
        "caseDesignAssumption": true
      },
      "rescheduleDecisionDue": {
        "at": "2026-11-17T11:00:00-05:00",
        "ref": "E05",
        "actorIds": [
          "P01"
        ],
        "executionTimezone": "America/New_York",
        "timingKind": "customerActionDue",
        "caseDesignAssumption": true
      },
      "rescheduleAuthorized": {
        "at": "2026-11-18T15:00:00-05:00",
        "ref": "E06",
        "actorIds": [
          "P06"
        ],
        "executionTimezone": "America/New_York",
        "timingKind": "plannedAction",
        "caseDesignAssumption": true
      },
      "rescheduleAuthorizationDue": {
        "at": "2026-11-19T17:00:00-05:00",
        "ref": "E06",
        "actorIds": [
          "P06"
        ],
        "executionTimezone": "America/New_York",
        "timingKind": "customerActionDue",
        "caseDesignAssumption": true
      },
      "rescheduleConfirmed": {
        "at": "2026-11-20T17:00:00+08:00",
        "ref": "E07",
        "actorIds": [
          "P07"
        ],
        "executionTimezone": "Asia/Shanghai",
        "timingKind": "expectedResponse",
        "caseDesignAssumption": true
      },
      "rescheduleNextUpdate": {
        "at": "2026-11-23T17:00:00+08:00",
        "ref": "E08",
        "actorIds": [
          "P07"
        ],
        "executionTimezone": "Asia/Shanghai",
        "timingKind": "expectedResponse",
        "caseDesignAssumption": true
      }
    },
    "durations": {
      "technicalReview": {
        "ref": "D07",
        "effortHours": 6,
        "turnaroundWorkdays": 3,
        "calendar": "customer"
      },
      "qualityReview": {
        "ref": "D07",
        "effortHours": 8,
        "turnaroundWorkdays": 3,
        "calendar": "customer"
      },
      "budgetReview": {
        "ref": "D07",
        "effortHours": 2,
        "turnaroundWorkdays": 1,
        "calendar": "customer"
      },
      "resourceConfirmation": {
        "ref": "D07",
        "effortHours": 2,
        "turnaroundWorkdays": 1,
        "calendar": "base"
      },
      "labPackage": {
        "ref": "D14",
        "turnaroundWorkdays": 12,
        "calendar": "base"
      },
      "internalAssessment": {
        "ref": "D14",
        "turnaroundWorkdays": 2,
        "calendar": "base"
      },
      "productionPreparation": {
        "ref": "D17",
        "turnaroundWorkdays": 15,
        "calendar": "base"
      },
      "preparationBuffer": {
        "ref": "D17",
        "turnaroundWorkdays": 1,
        "calendar": "base"
      },
      "seedExpansion": {
        "ref": "D19",
        "calendarDays": 14
      },
      "productionCulture": {
        "ref": "D20",
        "calendarDays": 14
      },
      "harvestPurification": {
        "ref": "D21",
        "calendarDays": 7
      },
      "releaseTesting": {
        "ref": "D22",
        "calendarDays": 21
      },
      "recordReview": {
        "ref": "D23",
        "turnaroundWorkdays": 10,
        "calendar": "base"
      },
      "finalQA": {
        "ref": "D24",
        "turnaroundWorkdays": 3,
        "calendar": "base"
      },
      "dispatchPreparation": {
        "ref": "D25",
        "turnaroundWorkdays": 1,
        "calendar": "base"
      },
      "transport": {
        "ref": "D26",
        "calendarDays": 5
      },
      "deliveryBuffer": {
        "ref": "D27",
        "turnaroundWorkdays": 3,
        "calendar": "customer"
      }
    },
    "lab": {
      "refs": [
        "D12",
        "D13",
        "D14",
        "D15"
      ],
      "prerequisiteKeys": [
        "existingPrePolishingIntermediate",
        "retainedFinalPurificationSample",
        "storageSuitabilityConfirmed",
        "quantityAndRetestAllowanceConfirmed",
        "existingResin",
        "existingSmallColumnModel",
        "existingMethods",
        "staffAndInstrumentSlots",
        "consumablesAvailable"
      ],
      "methodKeys": [
        "secHplc",
        "a280",
        "ceSds",
        "existingActivityMethod"
      ],
      "scope": {
        "baselineConditions": 1,
        "candidateConditions": 3,
        "replicatesPerCondition": 2,
        "screeningRuns": 8,
        "confirmationRuns": 2,
        "totalRuns": 10,
        "allSampleAnalysisKeys": [
          "secHplcHmw",
          "a280ConcentrationRecovery"
        ],
        "baselineAndConfirmationAnalysisKeys": [
          "ceSds",
          "activityTrend"
        ]
      },
      "phaseWorkdays": {
        "sampleCheck": 2,
        "screening": 3,
        "firstAnalysis": 2,
        "candidateConfirmation": 2,
        "finalAnalysis": 3
      },
      "exclusionKeys": [
        "newMethodDevelopment",
        "upstreamRepeat",
        "newResin",
        "newUnitOperation",
        "engineeringBatch",
        "longTermStability",
        "fullComparabilityStudy"
      ],
      "acceptanceKey": "existingProjectEvaluationRequirements",
      "successGuaranteed": false
    },
    "plans": {
      "A": {
        "id": "A",
        "ref": "D15",
        "quoteRef": "Q-A",
        "total": 80000,
        "queueWorkdays": 0,
        "window": {
          "at": "2027-01-04T09:00:00+08:00",
          "ref": "D18",
          "statusKey": "originalWindow",
          "startDefinitionKey": "cellThawSeedExpansion"
        },
        "windowStatusKey": "notYetHeld",
        "holdUntil": "2026-12-09T17:00:00+08:00",
        "forecast": {
          "ref": "D28",
          "delivery": "2027-03-11T17:00:00-05:00",
          "localDate": "2027-03-11",
          "needByGapDays": 8,
          "statusKey": "conditionalEstimate",
          "includesBuffer": true
        },
        "stages": [
          {
            "id": "sampleCheck",
            "ref": "D14",
            "start": "2026-11-17T09:00:00+08:00",
            "end": "2026-11-18T17:00:00+08:00",
            "calendar": "base",
            "executionTimezone": "Asia/Shanghai",
            "unit": "workdays",
            "dependsOn": [],
            "duration": 2
          },
          {
            "id": "screening",
            "ref": "D14",
            "start": "2026-11-19T09:00:00+08:00",
            "end": "2026-11-23T17:00:00+08:00",
            "calendar": "base",
            "executionTimezone": "Asia/Shanghai",
            "unit": "workdays",
            "dependsOn": [
              "sampleCheck"
            ],
            "duration": 3
          },
          {
            "id": "firstAnalysis",
            "ref": "D14",
            "start": "2026-11-24T09:00:00+08:00",
            "end": "2026-11-25T17:00:00+08:00",
            "calendar": "base",
            "executionTimezone": "Asia/Shanghai",
            "unit": "workdays",
            "dependsOn": [
              "screening"
            ],
            "duration": 2
          },
          {
            "id": "candidateConfirmation",
            "ref": "D14",
            "start": "2026-11-26T09:00:00+08:00",
            "end": "2026-11-27T17:00:00+08:00",
            "calendar": "base",
            "executionTimezone": "Asia/Shanghai",
            "unit": "workdays",
            "dependsOn": [
              "firstAnalysis"
            ],
            "duration": 2
          },
          {
            "id": "finalAnalysis",
            "ref": "D14",
            "start": "2026-11-30T09:00:00+08:00",
            "end": "2026-12-02T17:00:00+08:00",
            "calendar": "base",
            "executionTimezone": "Asia/Shanghai",
            "unit": "workdays",
            "dependsOn": [
              "candidateConfirmation"
            ],
            "duration": 3
          },
          {
            "id": "internalAssessment",
            "ref": "D14",
            "start": "2026-12-03T09:00:00+08:00",
            "end": "2026-12-04T17:00:00+08:00",
            "calendar": "base",
            "executionTimezone": "Asia/Shanghai",
            "unit": "workdays",
            "dependsOn": [
              "finalAnalysis"
            ],
            "duration": 2
          },
          {
            "id": "customerResultReview",
            "ref": "D16",
            "start": "2026-12-04T09:00:00-05:00",
            "end": "2026-12-08T17:00:00-05:00",
            "calendar": "customer",
            "executionTimezone": "America/New_York",
            "unit": "workdays",
            "dependsOn": [
              "internalAssessment"
            ],
            "duration": 3,
            "parallelActorIds": [
              "P02",
              "P03"
            ]
          },
          {
            "id": "windowUseConfirmation",
            "ref": "D16",
            "start": "2026-12-09T09:00:00+08:00",
            "end": "2026-12-09T17:00:00+08:00",
            "calendar": "base",
            "executionTimezone": "Asia/Shanghai",
            "unit": "workdays",
            "dependsOn": [
              "customerResultReview"
            ],
            "duration": 1
          },
          {
            "id": "productionPreparation",
            "ref": "D17",
            "start": "2026-12-10T09:00:00+08:00",
            "end": "2026-12-30T17:00:00+08:00",
            "calendar": "base",
            "executionTimezone": "Asia/Shanghai",
            "unit": "workdays",
            "dependsOn": [
              "windowUseConfirmation"
            ],
            "duration": 15
          },
          {
            "id": "preparationBuffer",
            "ref": "D17",
            "start": "2026-12-31T09:00:00+08:00",
            "end": "2026-12-31T17:00:00+08:00",
            "calendar": "base",
            "executionTimezone": "Asia/Shanghai",
            "unit": "workdays",
            "dependsOn": [
              "productionPreparation"
            ],
            "duration": 1
          },
          {
            "id": "windowWait",
            "ref": "D17",
            "start": "2026-12-31T17:00:00+08:00",
            "end": "2027-01-04T09:00:00+08:00",
            "calendar": "continuous",
            "executionTimezone": "Asia/Shanghai",
            "unit": "interval",
            "dependsOn": [
              "preparationBuffer"
            ]
          },
          {
            "id": "seedExpansion",
            "ref": "D19",
            "start": "2027-01-04T09:00:00+08:00",
            "end": "2027-01-18T09:00:00+08:00",
            "calendar": "continuous",
            "executionTimezone": "Asia/Shanghai",
            "unit": "calendarDays",
            "dependsOn": [
              "windowWait"
            ],
            "duration": 14
          },
          {
            "id": "productionCulture",
            "ref": "D20",
            "start": "2027-01-18T09:00:00+08:00",
            "end": "2027-02-01T09:00:00+08:00",
            "calendar": "continuous",
            "executionTimezone": "Asia/Shanghai",
            "unit": "calendarDays",
            "dependsOn": [
              "seedExpansion"
            ],
            "duration": 14
          },
          {
            "id": "harvestPurification",
            "ref": "D21",
            "start": "2027-02-01T09:00:00+08:00",
            "end": "2027-02-08T09:00:00+08:00",
            "calendar": "continuous",
            "executionTimezone": "Asia/Shanghai",
            "unit": "calendarDays",
            "dependsOn": [
              "productionCulture"
            ],
            "duration": 7
          },
          {
            "id": "releaseTesting",
            "ref": "D22",
            "start": "2027-02-08T09:00:00+08:00",
            "end": "2027-03-01T09:00:00+08:00",
            "calendar": "continuous",
            "executionTimezone": "Asia/Shanghai",
            "unit": "calendarDays",
            "dependsOn": [
              "harvestPurification"
            ],
            "duration": 21
          },
          {
            "id": "recordReview",
            "ref": "D23",
            "start": "2027-02-15T09:00:00+08:00",
            "end": "2027-02-26T17:00:00+08:00",
            "calendar": "base",
            "executionTimezone": "Asia/Shanghai",
            "unit": "workdays",
            "dependsOn": [
              "harvestPurification"
            ],
            "duration": 10,
            "parallelWith": "releaseTesting"
          },
          {
            "id": "finalQA",
            "ref": "D24",
            "start": "2027-03-01T09:00:00+08:00",
            "end": "2027-03-03T17:00:00+08:00",
            "calendar": "base",
            "executionTimezone": "Asia/Shanghai",
            "unit": "workdays",
            "dependsOn": [
              "releaseTesting",
              "recordReview"
            ],
            "duration": 3
          },
          {
            "id": "dispatchPreparation",
            "ref": "D25",
            "start": "2027-03-04T09:00:00+08:00",
            "end": "2027-03-04T17:00:00+08:00",
            "calendar": "base",
            "executionTimezone": "Asia/Shanghai",
            "unit": "workdays",
            "dependsOn": [
              "finalQA"
            ],
            "duration": 1
          },
          {
            "id": "transport",
            "ref": "D26",
            "start": "2027-03-04T17:00:00+08:00",
            "end": "2027-03-09T17:00:00+08:00",
            "calendar": "continuous",
            "executionTimezone": "Asia/Shanghai",
            "executionTimezoneNoteKey": "crossBorderShanghaiReference",
            "unit": "calendarDays",
            "dependsOn": [
              "dispatchPreparation"
            ],
            "duration": 5
          },
          {
            "id": "deliveryBuffer",
            "ref": "D27",
            "start": "2027-03-09T09:00:00-05:00",
            "end": "2027-03-11T17:00:00-05:00",
            "calendar": "customer",
            "executionTimezone": "America/New_York",
            "unit": "workdays",
            "dependsOn": [
              "transport"
            ],
            "duration": 3,
            "bufferOnly": true
          }
        ],
        "assumptionKeys": [
          "existingSamplesMethodsResources",
          "inScopeOptimizationMeetsRequirements",
          "technicalQualityConfirmedOnTime",
          "preparationAndManufacturingNoNewExceptions",
          "testingNoNewExceptions",
          "logisticsAvailable"
        ]
      },
      "B": {
        "id": "B",
        "ref": "D15",
        "quoteRef": "Q-B",
        "total": 40000,
        "queueWorkdays": 10,
        "window": {
          "at": "2027-02-15T09:00:00+08:00",
          "ref": "D18",
          "statusKey": "candidatePendingConfirmation",
          "startDefinitionKey": "cellThawSeedExpansion"
        },
        "windowStatusKey": "pendingConfirmation",
        "holdUntil": null,
        "forecast": {
          "ref": "D28",
          "delivery": "2027-04-22T17:00:00-04:00",
          "localDate": "2027-04-22",
          "needByGapDays": -34,
          "statusKey": "conditionalEstimate",
          "includesBuffer": true
        },
        "stages": [
          {
            "id": "resourceQueue",
            "ref": "D15",
            "start": "2026-11-17T09:00:00+08:00",
            "end": "2026-11-30T17:00:00+08:00",
            "calendar": "base",
            "executionTimezone": "Asia/Shanghai",
            "unit": "workdays",
            "dependsOn": [],
            "duration": 10
          },
          {
            "id": "sampleCheck",
            "ref": "D14",
            "start": "2026-12-01T09:00:00+08:00",
            "end": "2026-12-02T17:00:00+08:00",
            "calendar": "base",
            "executionTimezone": "Asia/Shanghai",
            "unit": "workdays",
            "dependsOn": [
              "resourceQueue"
            ],
            "duration": 2
          },
          {
            "id": "screening",
            "ref": "D14",
            "start": "2026-12-03T09:00:00+08:00",
            "end": "2026-12-07T17:00:00+08:00",
            "calendar": "base",
            "executionTimezone": "Asia/Shanghai",
            "unit": "workdays",
            "dependsOn": [
              "sampleCheck"
            ],
            "duration": 3
          },
          {
            "id": "firstAnalysis",
            "ref": "D14",
            "start": "2026-12-08T09:00:00+08:00",
            "end": "2026-12-09T17:00:00+08:00",
            "calendar": "base",
            "executionTimezone": "Asia/Shanghai",
            "unit": "workdays",
            "dependsOn": [
              "screening"
            ],
            "duration": 2
          },
          {
            "id": "candidateConfirmation",
            "ref": "D14",
            "start": "2026-12-10T09:00:00+08:00",
            "end": "2026-12-11T17:00:00+08:00",
            "calendar": "base",
            "executionTimezone": "Asia/Shanghai",
            "unit": "workdays",
            "dependsOn": [
              "firstAnalysis"
            ],
            "duration": 2
          },
          {
            "id": "finalAnalysis",
            "ref": "D14",
            "start": "2026-12-14T09:00:00+08:00",
            "end": "2026-12-16T17:00:00+08:00",
            "calendar": "base",
            "executionTimezone": "Asia/Shanghai",
            "unit": "workdays",
            "dependsOn": [
              "candidateConfirmation"
            ],
            "duration": 3
          },
          {
            "id": "internalAssessment",
            "ref": "D14",
            "start": "2026-12-17T09:00:00+08:00",
            "end": "2026-12-18T17:00:00+08:00",
            "calendar": "base",
            "executionTimezone": "Asia/Shanghai",
            "unit": "workdays",
            "dependsOn": [
              "finalAnalysis"
            ],
            "duration": 2
          },
          {
            "id": "customerResultReview",
            "ref": "D16",
            "start": "2026-12-18T09:00:00-05:00",
            "end": "2026-12-22T17:00:00-05:00",
            "calendar": "customer",
            "executionTimezone": "America/New_York",
            "unit": "workdays",
            "dependsOn": [
              "internalAssessment"
            ],
            "duration": 3,
            "parallelActorIds": [
              "P02",
              "P03"
            ]
          },
          {
            "id": "windowUseConfirmation",
            "ref": "D16",
            "start": "2026-12-23T09:00:00+08:00",
            "end": "2026-12-23T17:00:00+08:00",
            "calendar": "base",
            "executionTimezone": "Asia/Shanghai",
            "unit": "workdays",
            "dependsOn": [
              "customerResultReview"
            ],
            "duration": 1
          },
          {
            "id": "productionPreparation",
            "ref": "D17",
            "start": "2026-12-24T09:00:00+08:00",
            "end": "2027-01-14T17:00:00+08:00",
            "calendar": "base",
            "executionTimezone": "Asia/Shanghai",
            "unit": "workdays",
            "dependsOn": [
              "windowUseConfirmation"
            ],
            "duration": 15
          },
          {
            "id": "preparationBuffer",
            "ref": "D17",
            "start": "2027-01-15T09:00:00+08:00",
            "end": "2027-01-15T17:00:00+08:00",
            "calendar": "base",
            "executionTimezone": "Asia/Shanghai",
            "unit": "workdays",
            "dependsOn": [
              "productionPreparation"
            ],
            "duration": 1
          },
          {
            "id": "windowWait",
            "ref": "D17",
            "start": "2027-01-15T17:00:00+08:00",
            "end": "2027-02-15T09:00:00+08:00",
            "calendar": "continuous",
            "executionTimezone": "Asia/Shanghai",
            "unit": "interval",
            "dependsOn": [
              "preparationBuffer"
            ]
          },
          {
            "id": "seedExpansion",
            "ref": "D19",
            "start": "2027-02-15T09:00:00+08:00",
            "end": "2027-03-01T09:00:00+08:00",
            "calendar": "continuous",
            "executionTimezone": "Asia/Shanghai",
            "unit": "calendarDays",
            "dependsOn": [
              "windowWait"
            ],
            "duration": 14
          },
          {
            "id": "productionCulture",
            "ref": "D20",
            "start": "2027-03-01T09:00:00+08:00",
            "end": "2027-03-15T09:00:00+08:00",
            "calendar": "continuous",
            "executionTimezone": "Asia/Shanghai",
            "unit": "calendarDays",
            "dependsOn": [
              "seedExpansion"
            ],
            "duration": 14
          },
          {
            "id": "harvestPurification",
            "ref": "D21",
            "start": "2027-03-15T09:00:00+08:00",
            "end": "2027-03-22T09:00:00+08:00",
            "calendar": "continuous",
            "executionTimezone": "Asia/Shanghai",
            "unit": "calendarDays",
            "dependsOn": [
              "productionCulture"
            ],
            "duration": 7
          },
          {
            "id": "releaseTesting",
            "ref": "D22",
            "start": "2027-03-22T09:00:00+08:00",
            "end": "2027-04-12T09:00:00+08:00",
            "calendar": "continuous",
            "executionTimezone": "Asia/Shanghai",
            "unit": "calendarDays",
            "dependsOn": [
              "harvestPurification"
            ],
            "duration": 21
          },
          {
            "id": "recordReview",
            "ref": "D23",
            "start": "2027-03-22T09:00:00+08:00",
            "end": "2027-04-02T17:00:00+08:00",
            "calendar": "base",
            "executionTimezone": "Asia/Shanghai",
            "unit": "workdays",
            "dependsOn": [
              "harvestPurification"
            ],
            "duration": 10,
            "parallelWith": "releaseTesting"
          },
          {
            "id": "finalQA",
            "ref": "D24",
            "start": "2027-04-12T09:00:00+08:00",
            "end": "2027-04-14T17:00:00+08:00",
            "calendar": "base",
            "executionTimezone": "Asia/Shanghai",
            "unit": "workdays",
            "dependsOn": [
              "releaseTesting",
              "recordReview"
            ],
            "duration": 3
          },
          {
            "id": "dispatchPreparation",
            "ref": "D25",
            "start": "2027-04-15T09:00:00+08:00",
            "end": "2027-04-15T17:00:00+08:00",
            "calendar": "base",
            "executionTimezone": "Asia/Shanghai",
            "unit": "workdays",
            "dependsOn": [
              "finalQA"
            ],
            "duration": 1
          },
          {
            "id": "transport",
            "ref": "D26",
            "start": "2027-04-15T17:00:00+08:00",
            "end": "2027-04-20T17:00:00+08:00",
            "calendar": "continuous",
            "executionTimezone": "Asia/Shanghai",
            "executionTimezoneNoteKey": "crossBorderShanghaiReference",
            "unit": "calendarDays",
            "dependsOn": [
              "dispatchPreparation"
            ],
            "duration": 5
          },
          {
            "id": "deliveryBuffer",
            "ref": "D27",
            "start": "2027-04-20T09:00:00-04:00",
            "end": "2027-04-22T17:00:00-04:00",
            "calendar": "customer",
            "executionTimezone": "America/New_York",
            "unit": "workdays",
            "dependsOn": [
              "transport"
            ],
            "duration": 3,
            "bufferOnly": true
          }
        ],
        "assumptionKeys": [
          "existingSamplesMethodsResources",
          "inScopeOptimizationMeetsRequirements",
          "technicalQualityConfirmedOnTime",
          "preparationAndManufacturingNoNewExceptions",
          "testingNoNewExceptions",
          "logisticsAvailable"
        ]
      }
    },
    "fees": {
      "refs": [
        "D29",
        "D30",
        "D31"
      ],
      "currency": "USD",
      "shared": 30000,
      "expedite": 30000,
      "hold": 20000,
      "reschedule": 10000,
      "totals": {
        "A": 80000,
        "B": 40000,
        "AWithFallback": 90000
      },
      "premiumOverB": 40000,
      "resourceCommitment": 50000,
      "fallbackCap": 10000,
      "fallbackSelectedByDefault": false,
      "chargeTriggers": {
        "shared": "experimentStarted",
        "expedite": "resourceConfirmed",
        "hold": "windowHoldConfirmed",
        "reschedule": "rescheduleConfirmed"
      },
      "unconfirmedFeesAccrue": false,
      "additionalTechnicalWorkIncluded": false
    },
    "forecastAssumptionKeys": [
      "existingSamplesMethodsResources",
      "inScopeOptimizationMeetsRequirements",
      "technicalQualityConfirmedOnTime",
      "preparationAndManufacturingNoNewExceptions",
      "testingNoNewExceptions",
      "logisticsAvailable"
    ],
    "invalidForecastStateKey": "reassessmentRequired",
    "branchPresets": {
      "customerRejected": {
        "ref": "D31",
        "atEvent": "budgetAuthorized",
        "nextOwnerId": "P01",
        "allowsRescheduleRequest": true,
        "confirmsCandidateWindow": false
      },
      "resourceRejected": {
        "ref": "D32",
        "atEvent": "resourceConfirmed",
        "nextOwnerId": "P07",
        "allowsRescheduleRequest": true,
        "confirmsCandidateWindow": false
      }
    },
    "milestones": [
      {
        "key": "dna",
        "statusKey": "contextOnly"
      },
      {
        "key": "processDevelopment",
        "statusKey": "current"
      },
      {
        "key": "firstGmpDs",
        "statusKey": "notStarted",
        "eventRef": "originalWindow"
      },
      {
        "key": "releasedDsDelivery",
        "statusKey": "estimated",
        "planRef": "A"
      },
      {
        "key": "ind",
        "statusKey": "notAssessed"
      }
    ],
    "rescheduleTiming": {
      "requestEvent": "rescheduleRequested",
      "quoteEvent": "rescheduleQuotePrepared",
      "quoteReturnEvent": "rescheduleQuoteReturned",
      "customerAvailableEvent": "rescheduleCustomerAvailable",
      "decisionEvent": "rescheduleDecisionCreated",
      "decisionDueEvent": "rescheduleDecisionDue",
      "authorizationEvent": "rescheduleAuthorized",
      "authorizationDueEvent": "rescheduleAuthorizationDue",
      "confirmationEvent": "rescheduleConfirmed",
      "nextUpdateEvent": "rescheduleNextUpdate",
      "refs": [
        "E01",
        "E02",
        "E03",
        "E04",
        "E05",
        "E06",
        "E07",
        "E08"
      ],
      "officeTurnaroundHours": {
        "quote": 14,
        "quoteReturn": 2,
        "customerDecision": 1,
        "authorization": 13,
        "confirmation": 16,
        "nextUpdate": 8
      },
      "weekendDutyAssumed": false
    },
    "rescheduleTimeline": [
      {
        "id": "rescheduleRequested",
        "eventRef": "rescheduleRequested",
        "ownerIds": [
          "P07"
        ],
        "statusKey": "planned"
      },
      {
        "id": "rescheduleQuotePrepared",
        "eventRef": "rescheduleQuotePrepared",
        "ownerIds": [
          "P08"
        ],
        "statusKey": "planned"
      },
      {
        "id": "rescheduleQuoteReturned",
        "eventRef": "rescheduleQuoteReturned",
        "ownerIds": [
          "P07"
        ],
        "statusKey": "planned"
      },
      {
        "id": "rescheduleDecisionCreated",
        "eventRef": "rescheduleDecisionCreated",
        "ownerIds": [
          "P01"
        ],
        "statusKey": "planned"
      },
      {
        "id": "rescheduleAuthorized",
        "eventRef": "rescheduleAuthorized",
        "ownerIds": [
          "P06"
        ],
        "statusKey": "planned"
      },
      {
        "id": "rescheduleConfirmed",
        "eventRef": "rescheduleConfirmed",
        "ownerIds": [
          "P07"
        ],
        "statusKey": "planned"
      }
    ]
  };

  // Freeze nested records so view code cannot silently rewrite the agreed baseline.
  function freeze(value) {
    Object.values(value).forEach(function (child) {
      if (child && typeof child === "object") freeze(child);
    });
    return Object.freeze(value);
  }
  global.DEMO_DATA = freeze(data);
})(globalThis);
