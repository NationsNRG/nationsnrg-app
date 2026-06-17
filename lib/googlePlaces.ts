import { supabase } from './supabase';

export interface PlaceSearchParams {
    location: string; // "Miami, FL"
    radius?: number; // meters, default 5000
    types?: string[]; // 'restaurant', 'gym', etc.
    maxResults?: number; // default 20
}

export interface PlaceDetails {
    place_id: string;
    name: string;
    formatted_address: string;
    address_components?: any[];
    geometry: {
        location: {
            lat: number;
            lng: number;
        }
    };
    types: string[];
    rating?: number;
    user_ratings_total?: number;
    formatted_phone_number?: string;
    international_phone_number?: string;
    website?: string;
    opening_hours?: any;
    price_level?: number;
    business_status?: string;
    photos?: any[];
    
    // Additional fields we'll enrich
    square_feet?: number;
    employee_count?: number;
    year_founded?: number;
    industry?: string;
}

class GooglePlacesService {
    private apiKey: string;
    
    constructor() {
        this.apiKey = process.env.GOOGLE_PLACES_API_KEY || '';
        if (!this.apiKey) {
            console.warn('GOOGLE_PLACES_API_KEY not set');
        }
    }
    
    /**
     * Search for places by location and type
     */
    async searchPlaces(params: PlaceSearchParams): Promise<PlaceDetails[]> {
        const { location, radius = 5000, types = ['restaurant'], maxResults = 20 } = params;
        
        // Geocode location to get coordinates
        const coords = await this.geocodeLocation(location);
        if (!coords) {
            console.error(`Could not geocode location: ${location}`);
            return [];
        }
        
        const allResults: PlaceDetails[] = [];
        
        for (const type of types) {
            const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coords.lat},${coords.lng}&radius=${radius}&type=${type}&key=${this.apiKey}`;
            
            try {
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.status === 'OK' && data.results) {
                    // Get first batch
                    let results = data.results.slice(0, Math.floor(maxResults / types.length));
                    
                    // Get place details for each (to get phone, website, etc.)
                    for (const place of results) {
                        const details = await this.getPlaceDetails(place.place_id);
                        if (details) {
                            allResults.push(details);
                        }
                    }
                    
                    // Handle pagination if needed
                    let nextPageToken = data.next_page_token;
                    while (nextPageToken && allResults.length < maxResults) {
                        await this.delay(2000); // Required delay between paginated requests
                        const nextUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${nextPageToken}&key=${this.apiKey}`;
                        const nextResponse = await fetch(nextUrl);
                        const nextData = await nextResponse.json();
                        
                        if (nextData.status === 'OK' && nextData.results) {
                            const remainingSlots = maxResults - allResults.length;
                            const nextResults = nextData.results.slice(0, remainingSlots);
                            
                            for (const place of nextResults) {
                                const details = await this.getPlaceDetails(place.place_id);
                                if (details) {
                                    allResults.push(details);
                                }
                            }
                            
                            nextPageToken = nextData.next_page_token;
                        } else {
                            nextPageToken = null;
                        }
                    }
                }
            } catch (error) {
                console.error(`Error searching places for type ${type}:`, error);
            }
        }
        
        return allResults;
    }
    
    /**
     * Get detailed place information
     */
    async getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,international_phone_number,website,geometry,types,rating,user_ratings_total,opening_hours,price_level,business_status,photos,address_components&key=${this.apiKey}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.status === 'OK' && data.result) {
                const place = data.result;
                
                // Map to our PlaceDetails interface
                return {
                    place_id: placeId,
                    name: place.name || '',
                    formatted_address: place.formatted_address || '',
                    address_components: place.address_components,
                    geometry: place.geometry,
                    types: place.types || [],
                    rating: place.rating,
                    user_ratings_total: place.user_ratings_total,
                    formatted_phone_number: place.formatted_phone_number,
                    international_phone_number: place.international_phone_number,
                    website: place.website,
                    opening_hours: place.opening_hours,
                    price_level: place.price_level,
                    business_status: place.business_status,
                    photos: place.photos,
                    
                    // Enriched fields (will be calculated)
                    square_feet: this.estimateSquareFeet(place),
                    employee_count: this.estimateEmployeeCount(place),
                    industry: this.mapPlaceTypeToIndustry(place.types),
                    year_founded: undefined // Google doesn't provide this
                };
            }
            return null;
        } catch (error) {
            console.error('Error getting place details:', error);
            return null;
        }
    }
    
    /**
     * Geocode location string to coordinates
     */
    async geocodeLocation(location: string): Promise<{lat: number, lng: number} | null> {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${this.apiKey}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.status === 'OK' && data.results && data.results[0]) {
                const { lat, lng } = data.results[0].geometry.location;
                return { lat, lng };
            }
            return null;
        } catch (error) {
            console.error('Error geocoding location:', error);
            return null;
        }
    }
    
    /**
     * Map Google place types to our industry categories
     */
    private mapPlaceTypeToIndustry(types: string[]): string {
        const typeMap: Record<string, string> = {
            'restaurant': 'restaurant',
            'cafe': 'restaurant',
            'bakery': 'restaurant',
            'bar': 'restaurant',
            'meal_takeaway': 'fast food',
            'meal_delivery': 'fast food',
            'fast_food': 'fast food',
            'gym': 'gym',
            'fitness_center': 'gym',
            'health': 'gym',
            'spa': 'gym',
            'store': 'retail',
            'shop': 'retail',
            'clothing_store': 'retail',
            'electronics_store': 'retail',
            'furniture_store': 'retail',
            'home_goods_store': 'retail',
            'supermarket': 'grocery',
            'grocery_or_supermarket': 'grocery',
            'convenience_store': 'grocery',
            'hardware_store': 'retail',
            'home_improvement_store': 'retail',
            'shopping_mall': 'retail',
            'office': 'office',
            'accounting': 'office',
            'lawyer': 'office',
            'finance': 'office',
            'insurance_agency': 'office',
            'real_estate_agency': 'office',
            'doctor': 'medical',
            'dentist': 'medical',
            'healthcare': 'medical',
            'hospital': 'medical',
            'pharmacy': 'medical',
            'physiotherapist': 'medical',
            'lodging': 'hotel',
            'hotel': 'hotel',
            'motel': 'hotel',
            'resort_hotel': 'hotel',
            'warehouse': 'warehouse',
            'storage': 'warehouse',
            'manufacturing': 'manufacturing',
            'factory': 'manufacturing'
        };
        
        for (const type of types) {
            if (typeMap[type]) {
                return typeMap[type];
            }
        }
        return 'other';
    }
    
    /**
     * Estimate square footage based on place type
     * This is a rough estimate - in production, you might use building footprint data
     */
    private estimateSquareFeet(place: any): number {
        // Rough estimates by place type
        if (place.types?.includes('restaurant')) return 2500;
        if (place.types?.includes('fast_food')) return 2000;
        if (place.types?.includes('gym') || place.types?.includes('fitness_center')) return 15000;
        if (place.types?.includes('grocery_or_supermarket')) return 25000;
        if (place.types?.includes('supermarket')) return 35000;
        if (place.types?.includes('shopping_mall')) return 50000;
        if (place.types?.includes('office')) return 5000;
        if (place.types?.includes('warehouse')) return 20000;
        if (place.types?.includes('manufacturing')) return 30000;
        if (place.types?.includes('hotel') || place.types?.includes('lodging')) return 40000;
        if (place.types?.includes('store') || place.types?.includes('shop')) return 3000;
        
        return 2000; // Default
    }
    
    /**
     * Estimate employee count based on place type and rating volume
     */
    private estimateEmployeeCount(place: any): number {
        const userRatings = place.user_ratings_total || 0;
        
        // Rough estimate based on review volume and type
        if (place.types?.includes('restaurant')) {
            return Math.max(5, Math.floor(userRatings / 20));
        }
        if (place.types?.includes('fast_food')) {
            return Math.max(3, Math.floor(userRatings / 30));
        }
        if (place.types?.includes('gym')) {
            return Math.max(8, Math.floor(userRatings / 15));
        }
        if (place.types?.includes('grocery_or_supermarket')) {
            return Math.max(20, Math.floor(userRatings / 10));
        }
        if (place.types?.includes('office')) {
            return Math.max(10, Math.floor(userRatings / 5));
        }
        if (place.types?.includes('warehouse')) {
            return Math.max(15, Math.floor(userRatings / 8));
        }
        if (place.types?.includes('manufacturing')) {
            return Math.max(25, Math.floor(userRatings / 12));
        }
        if (place.types?.includes('hotel')) {
            return Math.max(30, Math.floor(userRatings / 7));
        }
        if (place.types?.includes('store') || place.types?.includes('shop')) {
            return Math.max(4, Math.floor(userRatings / 25));
        }
        
        return Math.max(2, Math.floor(userRatings / 20));
    }
    
    /**
     * Helper to add delay between paginated requests
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Extract address components
     */
    extractAddress(place: PlaceDetails) {
        let city = '';
        let state = '';
        let zip = '';
        
        if (place.address_components) {
            for (const component of place.address_components) {
                if (component.types.includes('locality')) {
                    city = component.long_name;
                }
                if (component.types.includes('administrative_area_level_1')) {
                    state = component.short_name;
                }
                if (component.types.includes('postal_code')) {
                    zip = component.long_name;
                }
            }
        }
        
        return { city, state, zip };
    }
    
    /**
     * Search and process businesses for a location
     */
    async searchAndProcess(location: string, types: string[], maxResults: number = 50) {
        console.log(`🔍 Searching ${location} for ${types.join(', ')}`);
        
        const places = await this.searchPlaces({
            location,
            types,
            maxResults
        });
        
        console.log(`✅ Found ${places.length} places`);
        
        return places.map(place => {
            const address = this.extractAddress(place);
            
            return {
                business_name: place.name,
                industry: place.industry || 'other',
                address: place.formatted_address,
                city: address.city,
                state: address.state,
                zip: address.zip,
                phone: place.formatted_phone_number || place.international_phone_number,
                website: place.website,
                square_feet: place.square_feet,
                employee_count: place.employee_count,
                // Google doesn't provide year founded
                year_founded: undefined,
                // Additional metadata
                place_id: place.place_id,
                rating: place.rating,
                reviews: place.user_ratings_total,
                price_level: place.price_level
            };
        });
    }
}

export const googlePlaces = new GooglePlacesService();