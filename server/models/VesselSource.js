/**
 * Vessel Source Model
 * Represents the timeline information for vessels from the Podium API
 */

/**
 * @typedef {Object} TmlnStats
 * @property {number} totalTimestamps - Total number of timestamps for this vessel
 * @property {string} minTimestamp - Earliest timestamp (ISO 8601 format)
 * @property {string} maxTimestamp - Latest timestamp (ISO 8601 format)
 */

/**
 * @typedef {Object} VesselSource
 * @property {string} accountId - Account identifier
 * @property {string} entityId - Entity identifier
 * @property {string} vesselName - Name of the vessel
 * @property {number} vesselIMO - IMO number of the vessel
 * @property {string} tmlnSeriesType - Type of timeline series (e.g., "ingested")
 * @property {string} tmlnDatasource - Data source (e.g., "ais_spire", "otis")
 * @property {TmlnStats} tmlnStats - Timeline statistics
 */

/**
 * @typedef {Object} TmlnInfoResponse
 * @property {VesselSource[]} tmlnInfoSet - Array of vessel timeline information
 * @property {Array} tmlnInfoGroups - Timeline information groups (currently empty)
 */

class VesselSourceModel {
  /**
   * Create a VesselSource instance
   * @param {Object} data - Raw vessel source data
   */
  constructor(data) {
    this.accountId = data.accountId;
    this.entityId = data.entityId;
    this.vesselName = data.vesselName;
    this.vesselIMO = data.vesselIMO;
    this.tmlnSeriesType = data.tmlnSeriesType;
    this.tmlnDatasource = data.tmlnDatasource;
    this.tmlnStats = {
      totalTimestamps: data.tmlnStats?.totalTimestamps || 0,
      minTimestamp: data.tmlnStats?.minTimestamp || null,
      maxTimestamp: data.tmlnStats?.maxTimestamp || null
    };
  }

  /**
   * Validate the vessel source data
   * @returns {boolean} True if valid, false otherwise
   */
  isValid() {
    return (
      this.accountId &&
      this.entityId &&
      this.vesselName &&
      this.vesselIMO &&
      this.tmlnSeriesType &&
      this.tmlnDatasource &&
      this.tmlnStats &&
      typeof this.tmlnStats.totalTimestamps === 'number'
    );
  }

  /**
   * Get vessel identifier (IMO)
   * @returns {number} Vessel IMO
   */
  getId() {
    return this.vesselIMO;
  }

  /**
   * Get vessel name
   * @returns {string} Vessel name
   */
  getName() {
    return this.vesselName;
  }

  /**
   * Get data source
   * @returns {string} Data source name
   */
  getDataSource() {
    return this.tmlnDatasource;
  }

  /**
   * Check if vessel has recent data (within last 30 days)
   * @returns {boolean} True if has recent data
   */
  hasRecentData() {
    if (!this.tmlnStats.maxTimestamp) return false;
    
    const maxDate = new Date(this.tmlnStats.maxTimestamp);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return maxDate > thirtyDaysAgo;
  }

  /**
   * Get timeline duration in days
   * @returns {number} Duration in days
   */
  getTimelineDurationDays() {
    if (!this.tmlnStats.minTimestamp || !this.tmlnStats.maxTimestamp) {
      return 0;
    }
    
    const minDate = new Date(this.tmlnStats.minTimestamp);
    const maxDate = new Date(this.tmlnStats.maxTimestamp);
    const diffTime = Math.abs(maxDate - minDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  /**
   * Convert to plain object
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      accountId: this.accountId,
      entityId: this.entityId,
      vesselName: this.vesselName,
      vesselIMO: this.vesselIMO,
      tmlnSeriesType: this.tmlnSeriesType,
      tmlnDatasource: this.tmlnDatasource,
      tmlnStats: this.tmlnStats
    };
  }

  /**
   * Create VesselSource from raw data
   * @param {Object} data - Raw data object
   * @returns {VesselSourceModel} VesselSource instance
   */
  static fromData(data) {
    return new VesselSourceModel(data);
  }

  /**
   * Parse API response and create VesselSource instances
   * @param {Object} response - API response object
   * @returns {VesselSourceModel[]} Array of VesselSource instances
   */
  static parseResponse(response) {
    if (!response || !response.tmlnInfoSet || !Array.isArray(response.tmlnInfoSet)) {
      console.warn('Invalid response format: tmlnInfoSet not found or not an array');
      return [];
    }

    return response.tmlnInfoSet
      .map(data => new VesselSourceModel(data))
      .filter(vessel => vessel.isValid());
  }

  /**
   * Group vessels by IMO number
   * @param {VesselSourceModel[]} vessels - Array of vessel sources
   * @returns {Map<number, VesselSourceModel[]>} Map of IMO to vessel sources
   */
  static groupByIMO(vessels) {
    const grouped = new Map();
    
    vessels.forEach(vessel => {
      const imo = vessel.vesselIMO;
      if (!grouped.has(imo)) {
        grouped.set(imo, []);
      }
      grouped.get(imo).push(vessel);
    });
    
    return grouped;
  }

  /**
   * Get unique vessels (deduplicated by IMO)
   * @param {VesselSourceModel[]} vessels - Array of vessel sources
   * @returns {VesselSourceModel[]} Array of unique vessels
   */
  static getUniqueVessels(vessels) {
    const grouped = VesselSourceModel.groupByIMO(vessels);
    const uniqueVessels = [];
    
    grouped.forEach((vesselSources, imo) => {
      // Prefer AIS data over OTIS if available
      const aisVessel = vesselSources.find(v => v.tmlnDatasource === 'ais_spire');
      if (aisVessel) {
        uniqueVessels.push(aisVessel);
      } else {
        uniqueVessels.push(vesselSources[0]);
      }
    });
    
    return uniqueVessels;
  }

  /**
   * Filter vessels by data source
   * @param {VesselSourceModel[]} vessels - Array of vessel sources
   * @param {string} dataSource - Data source to filter by
   * @returns {VesselSourceModel[]} Filtered array
   */
  static filterByDataSource(vessels, dataSource) {
    return vessels.filter(v => v.tmlnDatasource === dataSource);
  }

  /**
   * Filter vessels with recent data
   * @param {VesselSourceModel[]} vessels - Array of vessel sources
   * @returns {VesselSourceModel[]} Filtered array
   */
  static filterRecent(vessels) {
    return vessels.filter(v => v.hasRecentData());
  }
}

module.exports = VesselSourceModel;
