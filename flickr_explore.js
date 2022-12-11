/**
 * Fetch pretty photos from flickr explore/features.
 */

import * as fs from 'node:fs'
import path from 'node:path'
import pino from 'pino'
import dotenv from 'dotenv'
import Flickr from 'flickr-sdk'
import superagent from 'superagent'
import escapeFile from 'escape-filename'

dotenv.config()

const logger = pino({
	level: env_get_or_default('LOG_LEVEL', 'info')
}).child({
	name: 'flickr-explore'
})

const DATE_TIME_DELIM = 'T'
const HTTP_CODE_PASS = 200

const FLICKR_IMAGE_URL_BASE = new URL('https://live.staticflickr.com')

const IMAGE_META_ATTR = {
	DESC: 'description',
	LICENSE: 'license',
	DATE_TAKEN: 'date_taken',
	OWNER_NAME: 'owner_name',
	FORMAT_ORIG: 'original_format',
	URL_ORIG: 'url_o'
}
const IMAGE_META_ATTRS = [
	IMAGE_META_ATTR.DESC,
	IMAGE_META_ATTR.LICENSE,
	IMAGE_META_ATTR.DATE_TAKEN,
	IMAGE_META_ATTR.OWNER_NAME,
	IMAGE_META_ATTR.FORMAT_ORIG,
	IMAGE_META_ATTR.URL_ORIG
]
const PER_PAGE_DEFAULT = 100
const IMAGE_SIZE = {
	MEDIUM_FREE: '',		// 500
	BIGGEST_FREE: 'b',		// 1024
	ORIGINAL: 'o'			// unknown size
}
const IMAGE_EXT = {
	FLICKR_GENERATED: 'jpg'
}
const FILE_EXT = {
	JSON: 'json'
}

const FS = {
	PATH: {
		DATA: 'data',
		FEATURES_RES_DIR: null,
		FEATURES_RES_RAW: null,
		OUT: null
	},
	FILE: {
		FEATURES_RES_RAW: 'features_res_photos.json'
	}
}
const OUT_IMG_DIR_DEFAULT = path.join(FS.PATH.DATA, 'out')

const IMAGE_LIMIT_DEFAULT = 5
const IMAGE_SIZE_DEFAULT = IMAGE_SIZE.BIGGEST_FREE
const FILES_PER_IMAGE = 2

function main() {
	logger.info('logging initialized')
	logger.debug(process.env)
	
	// ensure data dir exists
	fs.mkdirSync(FS.PATH.DATA, {recursive: true})
	
	// ensure out dir exists
	FS.PATH.OUT = env_get_or_default('OUT_DIR', OUT_IMG_DIR_DEFAULT)
	fs.mkdirSync(FS.PATH.OUT, {recursive: true})
	
	const flickr = new Flickr(process.env.FLICKR_API_KEY)
	
	let now = get_latest_explore_datetime()

	let year = now.getUTCFullYear()
	// month method returns jan=0 dec=11
	let month = now.getUTCMonth() + 1
	let day = now.getUTCDate()

	const flickr_explore_page = `https://flickr.com/explore/${year}/${month}/${day}`
	logger.info(`flickr explore page = ${flickr_explore_page}`)
	
	let date_str = now.toISOString()
	date_str = date_str.substring(0, date_str.indexOf(DATE_TIME_DELIM))
	logger.info(`date str = ${date_str}`)
	
	let image_size = env_get_or_default('IMAGE_SIZE_CODE', IMAGE_SIZE_DEFAULT)
	let image_limit = parseInt(env_get_or_default('NEW_IMAGE_COUNT', IMAGE_LIMIT_DEFAULT))
	let old_image_limit = parseInt(env_get_or_default('OLD_IMAGE_COUNT', IMAGE_LIMIT_DEFAULT))
	
	let old_files = list_files_by_date_modified(FS.PATH.OUT)
	logger.debug(`old files: ${JSON.stringify(old_files, undefined, '\t')}`)
	
	let deleted_files = delete_oldest_images(old_files, old_image_limit, false)
	logger.info(`deleting ${deleted_files.length} files from ${FS.PATH.OUT}`)
	logger.debug(`deleted files: ${JSON.stringify(deleted_files)}`)
	let delete_file_idx = 0
	
	let all_new_files = []
	
	return load_features(date_str)
	.then(function(images_meta) {
		// randomize order
		images_meta.shuffle()
	
		// limit count
		let image_count = Math.floor(Math.min(images_meta.length, image_limit))
		images_meta = images_meta.slice(0, image_count)
		
		let p = new Array(image_count)
		logger.info(`fetch up to ${image_count} new images from flickr`)
		for (let i=0; i < image_count; i++) {
			let image_meta = images_meta[i]
		
			// fetch data for each new image
			p[i] = fetch_flickr_image(image_meta, image_size)
			.then(function(image_data) {
				return {
					meta: image_meta,
					data: image_data
				}
			})
			.catch(function(err) {
				logger.error(err)
				return {
					meta: image_meta,
					data: null
				}
			})
			// update out dir
			.then(function(image) {
				if (image.data != null) {
					// save image alongside attribution and other metadata in out dir
					let ctx =  {
						promise: save_image(image.meta, image.data, image_size != IMAGE_SIZE.ORIGINAL),
						delete_file_idx: delete_file_idx
					}
					delete_file_idx += FILES_PER_IMAGE
			
					return ctx.promise
					.then(
						// pass
						function(new_files) {
							all_new_files = all_new_files.concat(new_files)
							apply_deletes(ctx.delete_file_idx, deleted_files)
						},
						// fail
						function(err) {
							logger.warn(`skip failed write for ${image.meta['title']}. ${err}`)
						}
					)
				}
				else {
					logger.warn(`skip missing data for ${image.meta['title']}`)
				}
			})
		}
	
		return Promise.all(p)
	})
	// finish deletes
	.then(function() {
		if (delete_file_idx < deleted_files.length) {
			// further deletes needed to not exceed old image limit
			p.push(
				new Promise(function(res) {
					logger.info(`deletes needed beyond ${image_limit} to not exceed ${old_image_limit}`)
					while (delete_file_idx < deleted_files.length) {
						apply_deletes(delete_file_idx, deleted_files)
						delete_file_idx += FILES_PER_IMAGE
					}
			
					res()
				})
			)
		}
	})
	// print results
	.then(function() {
		logger.info(`finished ${Math.floor(all_new_files.length/2)} new featured images update to ${FS.PATH.OUT}`)
		logger.debug(`new files: ${JSON.stringify(all_new_files, undefined, '\t')}`)
	})
	.catch(function(err) {
		logger.error(err)
	})
}

function apply_deletes(didx, deleted_files) {
	for (let di=didx; di < didx+FILES_PER_IMAGE; di++) {
		let df = deleted_files[di]
		if (df !== undefined) {
			logger.debug(`finalize file-delete[${di}]=${df}`)
			fs.unlinkSync(df)
		}
		else {
			logger.debug(`skip file-delete[${di}]`)
		}
	}
}

function delete_oldest_images(files, count, do_delete) {
	let image_count = Math.floor(files.length / FILES_PER_IMAGE)
	logger.debug(`old image count = ${image_count}`)
	
	let delete_count = image_count - count
	let deleted = []
	
	for (let i=0; files.length > 0 && i < delete_count; i++) {
		let file1 = files[0]
		let fname = path.basename(file1, path.extname(file1))
		files.splice(0, 1)
		
		if (do_delete) { fs.unlinkSync(file1) }
		deleted.push(file1)
		
		let idx = -1, filen = undefined
		for (let j=1; j < FILES_PER_IMAGE; j++) {
			let idx = files.findIndex(file => path.basename(file, path.extname(file)) == fname)
			if (idx !== -1) {
				let filen = files[idx]
				files.splice(idx, 1)
				
				if (filen !== undefined) {
					if (do_delete) { fs.unlinkSync(filen) }
					deleted.push(filen)
				}
				else {
					logger.warn(`unable to find file ${j+1} for ${file1}; skip delete`)
				}
			}
		}
	}
	
	return deleted
}

function list_files_by_date_modified(dir) {
	try {
		let files = fs.readdirSync(dir)
	
		// associate name w date modified
		return files.map((fileName) => ({
			name: fileName,
			time: fs.statSync(path.join(dir, fileName)).mtime.getTime()
		}))
		// sort by date modified, ascending
		.sort((a, b) => a.time - b.time)
		// return file paths
		.map(f => path.join(dir, f.name))
	}
	catch (err) {
		logger.error(`failed to list files in ${dir}; assume directory is empty. ${err}`)
		return []
	}
}

function save_image(meta, data, flickr_format) {
	let filename = escapeFile.escape(`${meta['id']}-${meta['title']}`)
	
	let meta_path = path.join(FS.PATH.OUT, `${filename}.json`)
	let ext = flickr_format || meta['originalformat'] === undefined 
		? IMAGE_EXT.FLICKR_GENERATED 
		: meta['originalformat']
	let data_path = path.join(FS.PATH.OUT, `${filename}.${ext}`)
	
	return Promise.all([
		// meta
		new Promise(function(res, rej) {
			fs.writeFile(
				meta_path,
				JSON.stringify(meta, undefined, '\t'),
				{encoding: 'utf8', flag: 'w'},
				function(err) {
					if (err) {
						rej(`failed to save ${meta['title']} metadata. ${err}`)
					}
					else {
						logger.info(`saved ${meta['title']} metadata to ${meta_path}`)
						res(meta_path)
					}
				}
			)
		}),
		// data
		new Promise(function(res, rej) {
			fs.writeFile(
				data_path,
				data,
				{flag: 'w'},
				function(err) {
					if (err) {
						rej(`failed to save ${meta['title']} image. ${err}`)
					}
					else {
						logger.info(`saved ${meta['title']} image to ${data_path}`)
						res(data_path)
					}
				}
			)
		})
	])
}

function fetch_flickr_image(image_meta, image_size) {
	return new Promise(function(res, rej) {
		if (image_size == IMAGE_SIZE.ORIGINAL && image_meta['originalsecret'] === undefined) {
			logger.warn(`access to original image for ${image_meta['title']} denied; revert to biggest preview`)
			image_size = IMAGE_SIZE.BIGGEST_FREE
		}
		
		let size = image_size
		let server = image_meta['server']
		let image = image_meta['id']
		let secret = image_size == IMAGE_SIZE.ORIGINAL ? image_meta['originalsecret'] : image_meta['secret']
		let ext = image_size == IMAGE_SIZE.ORIGINAL ? image_meta['originalformat'] : IMAGE_EXT.FLICKR_GENERATED
		let url = new URL(`/${server}/${image}_${secret}_${size}.${ext}`, FLICKR_IMAGE_URL_BASE)
		
		logger.debug(`send GET to ${url}`)
		
		superagent
		.get(url)
		.end((err, http_res) => {
			if (err) {
				rej(`failed to fetch image from ${url} for image ${JSON.stringify(image_meta)}. ${err}`)
			}
			else {
				// logger.debug(http_res)
				
				if (http_res['statusCode'] == HTTP_CODE_PASS) {
					let headers = http_res['headers']
					
					logger.info(
						`fetched image size=${headers['imagewidth']}x${headers['imageheight']} ` + 
						`type=${headers['content-type']} ` +
						`from ${url}`
					)
					
					res(http_res['body'])
				}
				else {
					rej(
						`failed to fetch image from ${url} for image ${image_meta['title']}. ` + 
						`code=${http_res['statusCode']} ` + 
						`error=${http_res['error']} ` + 
						`serverError=${http_res['serverError']} ` +
						`forbidden=${http_res['forbidden']}`
					)
				}
			}
		})
	})
}

function load_features(date_str) {
	FS.PATH.FEATURES_RES_DIR = path.join(FS.PATH.DATA, date_str)
	FS.PATH.FEATURES_RES_RAW = path.join(FS.PATH.FEATURES_RES_DIR, FS.FILE.FEATURES_RES_RAW)
	
	logger.info(`features response data dir = ${FS.PATH.FEATURES_RES_DIR}`)
	
	// ensure res dir exists
	fs.mkdirSync(FS.PATH.FEATURES_RES_DIR, {recursive: true})
	
	return new Promise(function(res, rej) {
		fs.access(FS.PATH.FEATURES_RES_RAW, fs.constants.F_OK | fs.constants.R_OK, function(missing) {
			if (missing) {
				logger.info(`${FS.PATH.FEATURES_RES_RAW} not found; fetch from flickr. ${missing}`)
			
				let flickr_per_page = env_get_or_default('PER_PAGE', PER_PAGE_DEFAULT)
				logger.info(`photos per page = ${flickr_per_page}`)
			
				fetch_flickr_features(flickr, date_str, flickr_per_page)
				.then(function(featured_images) {
					logger.info(`fetched ${featured_images.length} featured photos metadata from flickr`)
					res(featured_images)
				})
				.catch(rej)
			}
			else {
				logger.info(`${FS.PATH.FEATURES_RES_RAW} already exists; skip fetch and load from file`)
				fs.readFile(FS.PATH.FEATURES_RES_RAW, {encoding: 'utf8', flag: 'r'}, function(err, data) {
					if (err) {
						rej(`failed to read from ${FS.PATH.FEATURES_RES_RAW}. ${err}`)
					}
					else {
						let featured_images = JSON.parse(data)
						logger.info(`loaded ${featured_images.length} featured photos metadata from ${FS.PATH.FEATURES_RES_RAW}`)
						res(featured_images)
					}
				})
			}
		})
	})
}

function fetch_flickr_features(flickr, date_str, items_per_page) {
	const fetch_page = function(page) {
		return new Promise(function(res, rej) {
			const features_req = flickr.interestingness.getList({
				date: date_str,
				extras: IMAGE_META_ATTRS,
				per_page: items_per_page,
				page: page+1
			}).then(function(flickr_res) {
				logger.debug(flickr_res.body)
		
				logger.info(`features[date=${date_str}][page=${page}].count = ${flickr_res.body.photos.photo.length}`)
				
				res({
					featured_photos: flickr_res.body.photos.photo,
					pages: flickr_res.body.photos.pages
				})
			}).catch(function(err) {
				rej(`failed to fetch from flickr.interestingness. ${err}`)
			})
		})
	}
	
	return new Promise(function(res, rej) {
		let pages, featured_photos = []
		
		// first page
		fetch_page(0)
		// subsequent pages
		.then(function(data) {
			pages = data.pages
			featured_photos.push(data.featured_photos)
			
			let p = new Array(pages-1)
			for (let page=1; page < pages; page++) {
				p.push(fetch_page(page).then(function(data_next) {
					featured_photos.push(data_next.featured_photos)
				}))
			}
			
			return Promise.all(p)
		})
		// save and return
		.then(function() {
			// flatten results list
			featured_photos = featured_photos.flat()
			
			logger.info(`write features[date=${date_str}] to filesystem`)
			fs.writeFile(
				FS.PATH.FEATURES_RES_RAW, 
				JSON.stringify(featured_photos, undefined, '\t'), 
				{encoding: 'utf8', flag: 'w'}, 
				function(err) {
					if (err) {
						rej(`failed to write features to ${FS.PATH.FEATURES_RES_RAW}. ${err}`)
					}
					else {
						logger.info(`saved flickr.interestingess[date=${date_str}] to ${FS.PATH.FEATURES_RES_RAW}`)
						res(featured_photos)
					}
				}
			)
		})
		.catch(rej)
	})
}

function get_latest_explore_datetime() {
	let dt = new Date()

	// yesterday is latest complete explore page
	dt.setUTCDate(dt.getUTCDate() - 1)
	
	return dt
}

function env_get_or_default(key, default_val) {
	return process.env[key] != undefined && process.env[key] != '' ? process.env[key] : default_val
}

/**
 * Array shuffle adapted from https://stackoverflow.com/a/12646864/10200417
 */
Array.prototype.shuffle = function() {
    for (let i = this.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1))
        let temp = this[i]
        this[i] = this[j]
        this[j] = temp;
    }
}

main()
