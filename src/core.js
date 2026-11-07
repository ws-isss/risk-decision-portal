(function (global) {
  "use strict";

  function validLocalDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + "T12:00:00Z");
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  // Calendar-date comparison deliberately ignores elapsed DST hours.
  function calendarGap(needDate, deliveryDate) {
    if (!validLocalDate(needDate) || !validLocalDate(deliveryDate)) throw new Error("INVALID_LOCAL_DATE");
    return Math.round((Date.parse(needDate + "T12:00:00Z") - Date.parse(deliveryDate + "T12:00:00Z")) / 86400000);
  }

  function formatInstant(value, timeZone, options) {
    return new Intl.DateTimeFormat("en-US", Object.assign({ timeZone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true }, options)).format(new Date(value));
  }

  function formatLocalDate(value, options) {
    if (!validLocalDate(value)) throw new Error("INVALID_LOCAL_DATE");
    return new Intl.DateTimeFormat("en-US", Object.assign({ timeZone: "UTC", month: "short", day: "numeric", year: "numeric" }, options)).format(new Date(value + "T12:00:00Z"));
  }

  function createSession(data) {
    let state;
    function initial(scene) {
      return {
        scene, viewer: scene === "prepublication" ? "P07" : "P01",
        clock: scene === "prepublication" ? data.events.riskDiscovered.at : data.initialClock,
        needByLocalDate: data.baseline.needByLocalDate,
        deliverableOverride: "", destinationOverride: "", revision: 0,
        eventIds: [], resetNotice: false
      };
    }
    state = initial("customer");
    function snapshot() { return Object.freeze(Object.assign({}, state, { eventIds: Object.freeze(state.eventIds.slice()) })); }
    return Object.freeze({
      getState: snapshot,
      setViewer(id) {
        if (!data.people[id]) throw new Error("UNKNOWN_VIEWER");
        state.viewer = id;
        return snapshot();
      },
      setRequirement(values) {
        if (!validLocalDate(values.needByLocalDate)) throw new Error("INVALID_LOCAL_DATE");
        const changed = state.needByLocalDate !== values.needByLocalDate || state.deliverableOverride !== values.deliverableOverride || state.destinationOverride !== values.destinationOverride;
        state.needByLocalDate = values.needByLocalDate;
        state.deliverableOverride = values.deliverableOverride || "";
        state.destinationOverride = values.destinationOverride || "";
        if (changed) state.revision += 1;
        return snapshot();
      },
      advanceTo(eventId) {
        const event = data.events[eventId];
        if (!event) throw new Error("UNKNOWN_EVENT");
        if (state.eventIds.includes(eventId)) return snapshot();
        if (Date.parse(event.at) < Date.parse(state.clock)) throw new Error("CLOCK_CANNOT_REWIND");
        state.clock = event.at;
        state.eventIds.push(eventId);
        state.revision += 1;
        return snapshot();
      },
      reset(scene) {
        if (scene !== "customer" && scene !== "prepublication") throw new Error("UNKNOWN_SCENE");
        state = initial(scene);
        state.resetNotice = true;
        return snapshot();
      }
    });
  }

  global.DEMO_CORE = Object.freeze({ validLocalDate, calendarGap, formatInstant, formatLocalDate, createSession });
})(globalThis);
